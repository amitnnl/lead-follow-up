<?php
/**
 * dms_service.php — Enterprise Document Management System Core Engine
 * Handles banking-grade file validation, secure storage, versioning, audit logging, and smart checklists.
 */

if (!defined('DMS_SECRET_KEY')) {
    define('DMS_SECRET_KEY', 'Kaspr_DMS_Secret_Key_' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '_2026');
}

/**
 * Log immutable audit trail entry
 */
function dms_log_audit($conn, $doc_id, $action, $old_val = '', $new_val = '', $reason = '') {
    if (!$conn) return;
    $uid = function_exists('current_user_id') ? current_user_id() : 0;
    $role = function_exists('current_role') ? current_role() : 'system';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? 'CLI/System', 0, 250);

    $stmt = $conn->prepare("
        INSERT INTO `dms_audit_logs` (`document_id`, `user_id`, `user_role`, `action`, `ip_address`, `user_agent`, `old_value`, `new_value`, `reason`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    if ($stmt) {
        $stmt->bind_param("iisssssss", $doc_id, $uid, $role, $action, $ip, $ua, $old_val, $new_val, $reason);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * Enterprise File Validation
 * Returns ['success' => true/false, 'message' => '...', 'ext' => '...', 'mime' => '...', 'sha256' => '...']
 */
function dms_validate_file($file, $allowed_extensions = ['pdf','jpg','jpeg','png','webp'], $max_mb = 15) {
    if (empty($file) || !isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
        $code = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        return ['success' => false, 'message' => "Upload error (Code: {$code}). No valid file received."];
    }

    $tmpPath = $file['tmp_name'];
    $origName = $file['name'] ?? 'document.pdf';
    $fileSize = $file['size'] ?? filesize($tmpPath);

    // 1. File size check
    $maxBytes = $max_mb * 1024 * 1024;
    if ($fileSize > $maxBytes) {
        return ['success' => false, 'message' => "File exceeds maximum allowed size of {$max_mb}MB (Actual size: " . round($fileSize/1048576, 2) . "MB)."];
    }
    if ($fileSize < 100) {
        return ['success' => false, 'message' => "File is dangerously small or corrupted (< 100 bytes)."];
    }

    // 2. Extension check & double extension check
    $parts = explode('.', strtolower($origName));
    $ext = end($parts);
    if (!in_array($ext, $allowed_extensions)) {
        return ['success' => false, 'message' => "Extension '.{$ext}' is not permitted. Allowed extensions: " . implode(', ', str_replace(',', ', ', $allowed_extensions))];
    }

    // Check for dangerous secondary extensions (e.g., shell.php.jpg or malware.exe.png)
    $dangerous_exts = ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8', 'pl', 'py', 'cgi', 'asp', 'aspx', 'jsp', 'sh', 'bash', 'exe', 'msi', 'bat', 'cmd', 'vbs', 'js'];
    foreach ($parts as $p) {
        if (in_array($p, $dangerous_exts) && $p !== $ext) {
            return ['success' => false, 'message' => "Security Violation: Double extension with script/executable pattern detected ({$p}). Upload rejected."];
        }
    }

    // 3. Real MIME type validation
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $realMime = finfo_file($finfo, $tmpPath);
    finfo_close($finfo);

    $allowedMimesMap = [
        'pdf'  => ['application/pdf'],
        'jpg'  => ['image/jpeg', 'image/pjpeg'],
        'jpeg' => ['image/jpeg', 'image/pjpeg'],
        'png'  => ['image/png'],
        'webp' => ['image/webp']
    ];

    $allowedForExt = $allowedMimesMap[$ext] ?? ['application/octet-stream'];
    if (!in_array($realMime, $allowedForExt)) {
        return ['success' => false, 'message' => "MIME mismatch: File has extension '.{$ext}' but actual contents are '{$realMime}'."];
    }

    // 4. Magic Bytes signature check
    $handle = fopen($tmpPath, 'rb');
    $headerBytes = fread($handle, 16);
    fclose($handle);

    if ($ext === 'pdf' && strpos($headerBytes, '%PDF-') !== 0) {
        return ['success' => false, 'message' => "File corruption or spoofing check failed: PDF magic bytes not detected."];
    }
    if (in_array($ext, ['jpg', 'jpeg']) && strpos($headerBytes, "\xFF\xD8\xFF") !== 0) {
        return ['success' => false, 'message' => "File corruption or spoofing check failed: JPEG magic bytes not detected."];
    }
    if ($ext === 'png' && strpos($headerBytes, "\x89PNG\r\n\x1a\n") !== 0) {
        return ['success' => false, 'message' => "File corruption or spoofing check failed: PNG magic bytes not detected."];
    }
    if ($ext === 'webp' && (substr($headerBytes, 0, 4) !== 'RIFF' || substr($headerBytes, 8, 4) !== 'WEBP')) {
        return ['success' => false, 'message' => "File corruption or spoofing check failed: WEBP magic bytes not detected."];
    }

    // 5. Image quality / dimensions check if image
    if (strpos($realMime, 'image/') === 0) {
        $imgInfo = @getimagesize($tmpPath);
        if (!$imgInfo || $imgInfo[0] < 50 || $imgInfo[1] < 50) {
            return ['success' => false, 'message' => "Image resolution is too low (< 50x50px) or image header is corrupted."];
        }
    }

    // 6. Script injection scan inside non-executable files
    $contentSample = file_get_contents($tmpPath, false, null, 0, min($fileSize, 65536));
    if (preg_match('/(<\?php|<\?=|script\s+type|eval\s*\(|base64_decode\s*\(|system\s*\(|exec\s*\()/i', $contentSample)) {
        return ['success' => false, 'message' => "Security Shield triggered: Suspicious script tags or execution hooks detected inside file stream."];
    }

    // 7. Calculate SHA-256 Checksum
    $sha256 = hash_file('sha256', $tmpPath);

    return [
        'success' => true,
        'message' => 'Validation passed cleanly.',
        'ext'     => $ext,
        'mime'    => $realMime,
        'sha256'  => $sha256,
        'size'    => $fileSize
    ];
}

/**
 * Check for duplicate document hash across the lead or system
 */
function dms_check_duplicate($conn, $sha256, $lead_id, $exclude_doc_id = 0) {
    if (!$conn) return null;
    $stmt = $conn->prepare("SELECT id, original_name, category_code, doc_type_code, uploaded_at FROM `dms_documents` WHERE checksum_sha256 = ? AND lead_id = ? AND id != ? AND is_deleted = 0 LIMIT 1");
    if ($stmt) {
        $stmt->bind_param("sii", $sha256, $lead_id, $exclude_doc_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $dup = $res->fetch_assoc();
        $stmt->close();
        return $dup;
    }
    return null;
}

/**
 * Securely store uploaded file into isolated UUID storage
 */
function dms_store_file($file, $lead_id, $version_num, $uuid, $ext, &$stored_name, &$dest_path) {
    $uploadRoot = dirname(__DIR__) . '/uploads/dms';
    $dirPath = $uploadRoot . '/lead_' . intval($lead_id) . '/version_' . intval($version_num);
    if (!is_dir($dirPath)) {
        mkdir($dirPath, 0777, true);
        // Protect directory from direct listing / web execution
        file_put_contents($dirPath . '/.htaccess', "Options -Indexes\nDeny from all\n");
    }

    $stored_name = 'doc_' . $uuid . '.' . $ext;
    $absPath = $dirPath . '/' . $stored_name;
    
    if (move_uploaded_file($file['tmp_name'], $absPath)) {
        $dest_path = 'uploads/dms/lead_' . intval($lead_id) . '/version_' . intval($version_num) . '/' . $stored_name;
        return true;
    }
    return false;
}

/**
 * Sync with legacy lead_documents table for 100% Phase 1/Phase 2 backward compatibility
 */
function dms_sync_lead_documents($conn, $lead_id, $doc_type_code, $file_path, $status, $notes = '') {
    if (!$conn || empty($lead_id)) return;

    $mapped_type = 'other';
    if (in_array($doc_type_code, ['aadhaar', 'co_aadhaar', 'guarantor_aadhaar', 'agent_kyc'])) {
        $mapped_type = 'aadhaar';
    } elseif (in_array($doc_type_code, ['pan', 'co_pan', 'guarantor_pan'])) {
        $mapped_type = 'pan';
    } elseif (in_array($doc_type_code, ['bank_statement', 'co_bank_statement', 'agent_bank_details'])) {
        $mapped_type = 'bank_statement';
    } elseif ($doc_type_code === 'rc') {
        $mapped_type = 'rc';
    } elseif ($doc_type_code === 'insurance') {
        $mapped_type = 'insurance';
    } elseif (in_array($doc_type_code, ['invoice', 'dealer_quotation'])) {
        $mapped_type = 'other';
    } elseif ($doc_type_code === 'vehicle_image') {
        $mapped_type = 'vehicle_image';
    }

    $legacyStatus = in_array($status, ['verified', 'rejected']) ? $status : 'pending';

    $check = $conn->prepare("SELECT id FROM `lead_documents` WHERE lead_id = ? AND document_type = ? ORDER BY id DESC LIMIT 1");
    if ($check) {
        $check->bind_param("is", $lead_id, $mapped_type);
        $check->execute();
        $res = $check->get_result();
        $row = $res->fetch_assoc();
        $check->close();

        if ($row && isset($row['id'])) {
            $upd = $conn->prepare("UPDATE `lead_documents` SET file_path = ?, verification_status = ?, verification_notes = ? WHERE id = ?");
            if ($upd) {
                $upd->bind_param("sssi", $file_path, $legacyStatus, $notes, $row['id']);
                $upd->execute();
                $upd->close();
            }
        } else {
            $ins = $conn->prepare("INSERT INTO `lead_documents` (`lead_id`, `document_type`, `file_path`, `verification_status`, `verification_notes`) VALUES (?, ?, ?, ?, ?)");
            if ($ins) {
                $ins->bind_param("issss", $lead_id, $mapped_type, $file_path, $legacyStatus, $notes);
                $ins->execute();
                $ins->close();
            }
        }
    }
}

/**
 * Generate cryptographically signed URL for document download or preview
 */
function dms_generate_signed_url($doc_id, $uuid, $action = 'download', $expires_in_seconds = 3600) {
    $expires = time() + $expires_in_seconds;
    $payload = "{$action}_{$doc_id}_{$uuid}_{$expires}";
    $token = hash_hmac('sha256', $payload, DMS_SECRET_KEY);
    
    $base = defined('BASE_URL') ? BASE_URL : '';
    return "{$base}/api/dms?action={$action}&id={$doc_id}&expires={$expires}&token={$token}";
}

/**
 * Verify signed token
 */
function dms_verify_signed_url($doc_id, $uuid, $action, $expires, $token) {
    if (time() > $expires) {
        return false;
    }
    $payload = "{$action}_{$doc_id}_{$uuid}_{$expires}";
    $expectedToken = hash_hmac('sha256', $payload, DMS_SECRET_KEY);
    return hash_equals($expectedToken, $token);
}

/**
 * Smart Document Checklist Engine
 * Evaluates mandatory documents for a lead and returns complete status mapping
 */
function dms_get_checklist($conn, $lead_id) {
    if (!$conn) return ['checklists' => [], 'summary' => ['total' => 0, 'completed' => 0, 'percentage' => 0, 'can_disburse' => false]];

    // 1. Fetch lead details
    $loan_type = 'all';
    $vehicle_type = 'all';
    $customer_cat = 'all';

    if ($lead_id > 0) {
        $stmtL = $conn->prepare("SELECT loan_type, vehicle_condition, employment_type FROM `leads` WHERE id = ? LIMIT 1");
        if ($stmtL) {
            $stmtL->bind_param("i", $lead_id);
            $stmtL->execute();
            $resL = $stmtL->get_result();
            if ($rowL = $resL->fetch_assoc()) {
                $loanMap = [
                    'new_loan' => 'Personal Loan',
                    'refinance' => 'Vehicle Loan',
                    'repurchase' => 'Vehicle Loan',
                    'bt' => 'Personal Loan'
                ];
                $loan_type = $loanMap[$rowL['loan_type']] ?? 'Vehicle Loan';
                $vehicle_type = $rowL['vehicle_condition'] ?? 'all';
                $customer_cat = $rowL['employment_type'] ?? 'all';
            }
            $stmtL->close();
        }
    }

    // 2. Determine required document type codes from dms_checklists
    $required_codes = ['aadhaar', 'pan', 'bank_statement']; // Default baseline
    $block_prog = true;

    $stmtC = $conn->prepare("SELECT required_doc_types, block_progression FROM `dms_checklists` WHERE (loan_type = ? OR loan_type = 'all') AND (vehicle_type = ? OR vehicle_type = 'all') AND (customer_category = ? OR customer_category = 'all') ORDER BY block_progression DESC LIMIT 1");
    if ($stmtC) {
        $stmtC->bind_param("sss", $loan_type, $vehicle_type, $customer_cat);
        $stmtC->execute();
        $resC = $stmtC->get_result();
        if ($rowC = $resC->fetch_assoc()) {
            $decoded = json_decode($rowC['required_doc_types'], true);
            if (is_array($decoded) && !empty($decoded)) {
                $required_codes = $decoded;
            }
            $block_prog = (bool)$rowC['block_progression'];
        }
        $stmtC->close();
    }

    // 3. Fetch all active documents for this lead from dms_documents
    $docsMap = [];
    $stmtD = $conn->prepare("
        SELECT d.*, c.name as category_name, dt.name as doc_type_name
        FROM `dms_documents` d
        LEFT JOIN `dms_categories` c ON d.category_code = c.code
        LEFT JOIN `dms_document_types` dt ON d.doc_type_code = dt.code
        WHERE d.lead_id = ? AND d.is_deleted = 0
        ORDER BY d.version_number DESC, d.id DESC
    ");
    if ($stmtD) {
        $stmtD->bind_param("i", $lead_id);
        $stmtD->execute();
        $resD = $stmtD->get_result();
        while ($docRow = $resD->fetch_assoc()) {
            $code = $docRow['doc_type_code'];
            if (!isset($docsMap[$code])) {
                $docsMap[$code] = $docRow; // Keep latest active version
            }
        }
        $stmtD->close();
    }

    // Also check legacy lead_documents to ensure no false missing status
    $legacyMap = [];
    $stmtLeg = $conn->prepare("SELECT * FROM `lead_documents` WHERE lead_id = ? AND IFNULL(verification_notes, '') != 'Archived / Removed by user' ORDER BY id ASC");
    if ($stmtLeg) {
        $stmtLeg->bind_param("i", $lead_id);
        $stmtLeg->execute();
        $resLeg = $stmtLeg->get_result();
        while ($lRow = $resLeg->fetch_assoc()) {
            $lCode = $lRow['document_type'];
            $legacyMap[$lCode] = $lRow;
        }
        $stmtLeg->close();
    }

    // 4. Build checklist items
    $checklistItems = [];
    $totalRequired = 0;
    $completedRequired = 0;
    $allMandatoryVerifiedOrUploaded = true;

    // Fetch details of all required codes from dms_document_types
    $inClause = implode(',', array_fill(0, count($required_codes), '?'));
    $typesMap = [];
    $stmtT = $conn->prepare("SELECT dt.*, c.name as cat_name FROM `dms_document_types` dt LEFT JOIN `dms_categories` c ON dt.category_code = c.code WHERE dt.code IN ({$inClause})");
    if ($stmtT && !empty($required_codes)) {
        $types = str_repeat('s', count($required_codes));
        $stmtT->bind_param($types, ...$required_codes);
        $stmtT->execute();
        $resT = $stmtT->get_result();
        while ($tRow = $resT->fetch_assoc()) {
            $typesMap[$tRow['code']] = $tRow;
        }
        $stmtT->close();
    }

    foreach ($required_codes as $code) {
        $totalRequired++;
        $tMeta = $typesMap[$code] ?? ['name' => ucwords(str_replace('_', ' ', $code)), 'category_code' => 'customer', 'cat_name' => 'Customer Documents', 'has_expiry' => 0];

        $doc = $docsMap[$code] ?? null;
        $status = 'missing';
        $doc_id = 0;
        $file_path = '';
        $ver_status = '';
        $notes = '';
        $uploaded_at = '';
        $version = 0;
        $expiry_date = null;

        if ($doc) {
            $status = 'uploaded';
            $doc_id = intval($doc['id']);
            $file_path = $doc['file_path'];
            $ver_status = $doc['verification_status'];
            $notes = $doc['verification_notes'] ?? '';
            $uploaded_at = $doc['created_at'];
            $version = intval($doc['version_number']);
            $expiry_date = $doc['expiry_date'];

            if ($ver_status === 'verified') {
                $status = 'verified';
                $completedRequired++;
            } elseif ($ver_status === 'rejected') {
                $status = 'rejected';
                $allMandatoryVerifiedOrUploaded = false;
            } elseif ($ver_status === 'requires_reupload') {
                $status = 'requires_reupload';
                $allMandatoryVerifiedOrUploaded = false;
            } elseif ($ver_status === 'expired') {
                $status = 'expired';
                $allMandatoryVerifiedOrUploaded = false;
            } else {
                // Pending verification
                $status = 'pending';
                $completedRequired += 0.5; // Half credit until verified
            }
        } elseif (isset($legacyMap[$code])) {
            $lDoc = $legacyMap[$code];
            $status = $lDoc['verification_status'] === 'verified' ? 'verified' : ($lDoc['verification_status'] === 'rejected' ? 'rejected' : 'pending');
            $file_path = $lDoc['file_path'];
            $notes = $lDoc['verification_notes'] ?? '';
            $uploaded_at = $lDoc['uploaded_at'];
            if ($status === 'verified') {
                $completedRequired++;
            } else {
                $completedRequired += 0.5;
            }
        } else {
            $allMandatoryVerifiedOrUploaded = false;
        }

        $checklistItems[] = [
            'code' => $code,
            'name' => $tMeta['name'],
            'category_code' => $tMeta['category_code'],
            'category_name' => $tMeta['cat_name'],
            'is_mandatory' => true,
            'has_expiry' => (bool)$tMeta['has_expiry'],
            'status' => $status,
            'verification_status' => $ver_status ?: $status,
            'doc_id' => $doc_id,
            'file_path' => $file_path,
            'verification_notes' => $notes,
            'uploaded_at' => $uploaded_at,
            'version_number' => $version,
            'expiry_date' => $expiry_date
        ];
    }

    $pct = $totalRequired > 0 ? round(($completedRequired / $totalRequired) * 100) : 100;
    if ($pct > 100) $pct = 100;

    return [
        'checklists' => $checklistItems,
        'summary' => [
            'total_required' => $totalRequired,
            'completed' => floor($completedRequired),
            'percentage' => $pct,
            'block_progression' => $block_prog,
            'can_disburse' => $allMandatoryVerifiedOrUploaded || !$block_prog
        ]
    ];
}

/**
 * Run automatic expiry monitor
 * Flags documents where expiry_date < CURDATE()
 */
function dms_run_expiry_check($conn) {
    if (!$conn) return 0;
    $stmt = $conn->prepare("UPDATE `dms_documents` SET verification_status = 'expired', verification_notes = CONCAT(IFNULL(verification_notes,''), ' [System Flag: Document expired on ', expiry_date, ']') WHERE expiry_date IS NOT NULL AND expiry_date < CURDATE() AND verification_status != 'expired' AND is_deleted = 0");
    if ($stmt) {
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();
        return $affected;
    }
    return 0;
}

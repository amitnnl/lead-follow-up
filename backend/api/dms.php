<?php
/**
 * api/dms.php — Enterprise Document Management System REST API Gateway
 * Handles categories, smart checklists, multi-stage verification, version control,
 * expiry monitoring, audit trails, and bulk operations.
 */

// Enable CORS and Headers
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (empty($origin) || strpos($origin, 'http://localhost') === 0 || strpos($origin, 'http://127.0.0.1') === 0) {
    header("Access-Control-Allow-Origin: " . ($origin ?: 'http://localhost:5173'));
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

define('API_CONTEXT', true);
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/dms_service.php';

// Ensure tables exist on startup
ensure_dms_tables_exist($conn);

function dms_json_response($data, int $status = 200) {
    http_response_code($status);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function dms_json_error(string $msg, int $status = 400) {
    dms_json_response(['error' => $msg], $status);
}

function dms_require_login() {
    if (!is_logged_in()) {
        dms_json_error("Unauthorized. Please log in.", 401);
    }
}

// Parse request parameters
$method = $_SERVER['REQUEST_METHOD'];
$action = trim($_GET['action'] ?? ($_POST['action'] ?? ''));

// Parse JSON Body input
$input = json_decode(file_get_contents('php://input'), true) ?? [];
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}
if (empty($action) && !empty($input['action'])) {
    $action = $input['action'];
}

// Run automatic expiry monitoring periodically on read requests
if ($method === 'GET' && in_array($action, ['list', 'stats', 'expiries', 'checklist'])) {
    dms_run_expiry_check($conn);
}

switch ($action) {
    // ----------------------------------------------------
    // 1. GET / POST CATEGORIES & DOCUMENT TYPES
    // ----------------------------------------------------
    case 'categories':
        dms_require_login();
        if ($method === 'GET') {
            $cats = db_fetch_all($conn, "SELECT * FROM `dms_categories` WHERE is_active = 1 ORDER BY sort_order ASC, name ASC");
            $types = db_fetch_all($conn, "SELECT * FROM `dms_document_types` ORDER BY category_code ASC, name ASC");
            
            // Nest document types inside categories
            $nested = [];
            foreach ($cats as $c) {
                $c['document_types'] = [];
                foreach ($types as $t) {
                    if ($t['category_code'] === $c['code'] || intval($t['category_id']) === intval($c['id'])) {
                        $c['document_types'][] = $t;
                    }
                }
                $nested[] = $c;
            }
            dms_json_response(['categories' => $nested, 'document_types' => $types]);
        } elseif ($method === 'POST') {
            if (!is_admin() && !is_manager()) dms_json_error("Only Admins and Managers can create document categories.", 403);
            
            $code = strtolower(preg_replace('/[^a-z0-9_]/', '_', trim($input['code'] ?? '')));
            $name = trim($input['name'] ?? '');
            $desc = trim($input['description'] ?? '');
            $sort = intval($input['sort_order'] ?? 100);

            if (empty($code) || empty($name)) {
                dms_json_error("Category code and name are required.");
            }

            $stmt = $conn->prepare("INSERT INTO `dms_categories` (`code`, `name`, `description`, `sort_order`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, description=?, sort_order=?");
            if ($stmt) {
                $stmt->bind_param("sssisss", $code, $name, $desc, $sort, $name, $desc, $sort);
                $stmt->execute();
                $stmt->close();
                dms_log_audit($conn, 0, 'Create Category', '', "Created category: {$name} ({$code})", 'Admin configuration');
                dms_json_response(['message' => 'Category saved successfully.']);
            }
            dms_json_error("Failed to save category.");
        }
        break;

    case 'doc_types':
        dms_require_login();
        if ($method !== 'POST') dms_json_error("Method not allowed", 405);
        if (!is_admin() && !is_manager()) dms_json_error("Only Admins and Managers can create document types.", 403);

        $cat_code = trim($input['category_code'] ?? 'custom');
        $code = strtolower(preg_replace('/[^a-z0-9_]/', '_', trim($input['code'] ?? '')));
        $name = trim($input['name'] ?? '');
        $mandatory = !empty($input['is_mandatory']) ? 1 : 0;
        $expiry = !empty($input['has_expiry']) ? 1 : 0;
        $exts = trim($input['allowed_extensions'] ?? 'pdf,jpg,jpeg,png,webp');
        $max_size = intval($input['max_size_mb'] ?? 15);

        if (empty($code) || empty($name)) {
            dms_json_error("Document type code and name are required.");
        }

        $catRow = db_fetch_one($conn, "SELECT id FROM `dms_categories` WHERE code = ?", 's', [$cat_code]);
        $cat_id = $catRow ? intval($catRow['id']) : 1;

        $stmt = $conn->prepare("INSERT INTO `dms_document_types` (`category_id`, `category_code`, `code`, `name`, `is_mandatory`, `has_expiry`, `allowed_extensions`, `max_size_mb`) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, is_mandatory=?, has_expiry=?, allowed_extensions=?, max_size_mb=?");
        if ($stmt) {
            $stmt->bind_param("isssiisiisiis", $cat_id, $cat_code, $code, $name, $mandatory, $expiry, $exts, $max_size, $name, $mandatory, $expiry, $exts, $max_size);
            $stmt->execute();
            $stmt->close();
            dms_log_audit($conn, 0, 'Create Document Type', '', "Created document type: {$name} ({$code}) under category {$cat_code}", 'Admin configuration');
            dms_json_response(['message' => 'Document type saved successfully.']);
        }
        dms_json_error("Failed to save document type.");
        break;

    // ----------------------------------------------------
    // 2. SMART CHECKLIST ENGINE
    // ----------------------------------------------------
    case 'checklist':
        dms_require_login();
        $lead_id = intval($_GET['lead_id'] ?? ($input['lead_id'] ?? 0));
        if ($lead_id <= 0) dms_json_error("Lead ID is required.");
        
        $checklistData = dms_get_checklist($conn, $lead_id);
        dms_json_response($checklistData);
        break;

    // ----------------------------------------------------
    // 3. LIST DOCUMENTS (ENTERPRISE SEARCH & FILTERS)
    // ----------------------------------------------------
    case 'list':
        dms_require_login();
        $lead_id = intval($_GET['lead_id'] ?? 0);
        $customer_id = intval($_GET['customer_id'] ?? 0);
        $cat_code = trim($_GET['category_code'] ?? '');
        $doc_code = trim($_GET['doc_type_code'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $search = trim($_GET['search'] ?? '');
        $include_deleted = !empty($_GET['include_deleted']) && is_admin() ? 1 : 0;

        $where = ["1=1"];
        $params = [];
        $types = "";

        if (!$include_deleted) {
            $where[] = "d.is_deleted = 0";
        }
        if ($lead_id > 0) {
            $where[] = "d.lead_id = ?";
            $params[] = $lead_id;
            $types .= "i";
        }
        if ($customer_id > 0) {
            $where[] = "d.customer_id = ?";
            $params[] = $customer_id;
            $types .= "i";
        }
        if (!empty($cat_code)) {
            $where[] = "d.category_code = ?";
            $params[] = $cat_code;
            $types .= "s";
        }
        if (!empty($doc_code)) {
            $where[] = "d.doc_type_code = ?";
            $params[] = $doc_code;
            $types .= "s";
        }
        if (!empty($status) && $status !== 'all') {
            $where[] = "d.verification_status = ?";
            $params[] = $status;
            $types .= "s";
        }
        if (!empty($search)) {
            $where[] = "(d.original_name LIKE ? OR d.remarks LIKE ? OR d.verification_notes LIKE ? OR d.ocr_text LIKE ?)";
            $qLike = "%{$search}%";
            $params[] = $qLike; $params[] = $qLike; $params[] = $qLike; $params[] = $qLike;
            $types .= "ssss";
        }

        // Scoping checks for Executives and Agents
        if (is_executive() && $lead_id === 0) {
            $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id = ?", 'i', [current_user_id()]);
            $execId = $execRow['id'] ?? 0;
            $where[] = "d.lead_id IN (SELECT id FROM leads WHERE executive_id = {$execId})";
        } elseif (is_channel_agent() && $lead_id === 0) {
            $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
            $cheId = $cheRow['id'] ?? 0;
            $where[] = "d.lead_id IN (SELECT id FROM leads WHERE channel_executive_id = {$cheId} OR created_by = " . current_user_id() . ")";
        } elseif (is_agent() && $lead_id === 0) {
            $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
            $agId = $agRow['id'] ?? 0;
            $where[] = "d.lead_id IN (SELECT id FROM leads WHERE agent_id = {$agId} OR created_by = " . current_user_id() . ")";
        }

        $whereClause = implode(" AND ", $where);
        $sql = "
            SELECT d.*, c.name as category_name, dt.name as doc_type_name, u.name as uploader_name, vu.name as verifier_name
            FROM `dms_documents` d
            LEFT JOIN `dms_categories` c ON d.category_code = c.code
            LEFT JOIN `dms_document_types` dt ON d.doc_type_code = dt.code
            LEFT JOIN `users` u ON d.uploader_id = u.id
            LEFT JOIN `users` vu ON d.verifier_id = vu.id
            WHERE {$whereClause}
            ORDER BY d.created_at DESC, d.id DESC
        ";

        if (!empty($params)) {
            $docs = db_fetch_all($conn, $sql, $types, $params);
        } else {
            $docs = db_fetch_all($conn, $sql);
        }

        // Attach signed preview/download URLs
        foreach ($docs as &$doc) {
            $doc['download_url'] = dms_generate_signed_url($doc['id'], $doc['uuid'], 'download');
            $doc['preview_url']  = dms_generate_signed_url($doc['id'], $doc['uuid'], 'preview');
        }

        dms_json_response(['documents' => $docs, 'count' => count($docs)]);
        break;

    // ----------------------------------------------------
    // 4. SECURE DOCUMENT UPLOAD (SINGLE, MULTI, RESUMABLE)
    // ----------------------------------------------------
    case 'upload':
        dms_require_login();
        if ($method !== 'POST') dms_json_error("Method not allowed", 405);
        if (current_role() === 'staff') dms_json_error("Access denied: Staff members do not have upload permissions.", 403);

        $lead_id = intval($_POST['lead_id'] ?? 0);
        $doc_type_code = trim($_POST['doc_type_code'] ?? ($_POST['document_type'] ?? 'other'));
        $cat_code = trim($_POST['category_code'] ?? '');
        $remarks = trim($_POST['remarks'] ?? '');
        $expiry_date = !empty($_POST['expiry_date']) ? $_POST['expiry_date'] : null;
        $replace_doc_id = intval($_POST['replace_doc_id'] ?? 0);

        if ($lead_id <= 0 || empty($doc_type_code)) {
            dms_json_error("Lead ID and Document Type are required.");
        }

        // Fetch document type info & resolve category if omitted
        $tMeta = db_fetch_one($conn, "SELECT * FROM `dms_document_types` WHERE code = ?", 's', [$doc_type_code]);
        if (!$tMeta && empty($cat_code)) {
            $cat_code = 'custom';
        } elseif ($tMeta && empty($cat_code)) {
            $cat_code = $tMeta['category_code'];
        }

        $allowed_exts = !empty($tMeta['allowed_extensions']) ? explode(',', str_replace(' ', '', $tMeta['allowed_extensions'])) : ['pdf','jpg','jpeg','png','webp'];
        $max_mb = !empty($tMeta['max_size_mb']) ? intval($tMeta['max_size_mb']) : 20;

        if (empty($_FILES['file'])) {
            dms_json_error("No file uploaded or file exceeded server upload limits.");
        }

        $file = $_FILES['file'];
        $val = dms_validate_file($file, $allowed_exts, $max_mb);
        if (!$val['success']) {
            dms_json_error($val['message']);
        }

        // Check duplicates
        $duplicate = dms_check_duplicate($conn, $val['sha256'], $lead_id, $replace_doc_id);
        if ($duplicate && empty($_POST['force_duplicate'])) {
            dms_json_error("Duplicate File Warning: An identical file ('{$duplicate['original_name']}') was already uploaded to this lead on " . date('d M Y', strtotime($duplicate['uploaded_at'])) . ". If you are sure, re-upload with force_duplicate=1.");
        }

        $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );

        $uid = current_user_id();
        $version_number = 1;
        $existing_doc_id = $replace_doc_id;

        // If not replacing explicitly, check if an active document of this doc_type already exists on the lead
        if ($existing_doc_id <= 0) {
            $existRow = db_fetch_one($conn, "SELECT id, version_number, file_path, original_name, stored_name, file_size, checksum_sha256, uploader_id FROM `dms_documents` WHERE lead_id = ? AND doc_type_code = ? AND is_deleted = 0 ORDER BY id DESC LIMIT 1", 'is', [$lead_id, $doc_type_code]);
            if ($existRow) {
                $existing_doc_id = intval($existRow['id']);
            }
        } else {
            $existRow = db_fetch_one($conn, "SELECT id, version_number, file_path, original_name, stored_name, file_size, checksum_sha256, uploader_id FROM `dms_documents` WHERE id = ?", 'i', [$existing_doc_id]);
        }

        $stored_name = '';
        $dest_path = '';

        if ($existing_doc_id > 0 && $existRow) {
            $version_number = intval($existRow['version_number']) + 1;
            
            // Store new file in version folder
            if (!dms_store_file($file, $lead_id, $version_number, $uuid, $val['ext'], $stored_name, $dest_path)) {
                dms_json_error("Server error: Unable to store uploaded file onto disk.");
            }

            // Archive current version into history table before overriding
            $stmtH = $conn->prepare("INSERT INTO `dms_document_versions` (`document_id`, `version_number`, `original_name`, `stored_name`, `file_path`, `file_size`, `checksum_sha256`, `uploader_id`, `change_reason`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if ($stmtH) {
                $vOld = intval($existRow['version_number']);
                $reason = "Replaced by version v{$version_number}";
                $stmtH->bind_param("iisssisis", $existing_doc_id, $vOld, $existRow['original_name'], $existRow['stored_name'], $existRow['file_path'], $existRow['file_size'], $existRow['checksum_sha256'], $existRow['uploader_id'], $reason);
                $stmtH->execute();
                $stmtH->close();
            }

            // Update dms_documents main entry
            $origName = $file['name'];
            $fileSize = $val['size'];
            $sha256 = $val['sha256'];
            $mime = $val['mime'];
            $ext = $val['ext'];

            $upd = $conn->prepare("UPDATE `dms_documents` SET uuid = ?, original_name = ?, stored_name = ?, file_path = ?, extension = ?, mime_type = ?, file_size = ?, checksum_sha256 = ?, uploader_id = ?, version_number = ?, verification_status = 'pending', expiry_date = COALESCE(?, expiry_date), remarks = COALESCE(NULLIF(?,''), remarks) WHERE id = ?");
            if ($upd) {
                $upd->bind_param("ssssssisiiisi", $uuid, $origName, $stored_name, $dest_path, $ext, $mime, $fileSize, $sha256, $uid, $version_number, $expiry_date, $remarks, $existing_doc_id);
                $upd->execute();
                $upd->close();
            }

            $finalDocId = $existing_doc_id;
            dms_log_audit($conn, $finalDocId, 'Replace', "v{$vOld}: {$existRow['original_name']}", "v{$version_number}: {$origName}", "Uploaded replacement version");
            log_lead_action($conn, $lead_id, 'Document Updated (v' . $version_number . ')', "Uploaded replacement document for: " . strtoupper($doc_type_code), $uid);
        } else {
            // New document
            if (!dms_store_file($file, $lead_id, 1, $uuid, $val['ext'], $stored_name, $dest_path)) {
                dms_json_error("Server error: Unable to store uploaded file onto disk.");
            }

            $origName = $file['name'];
            $fileSize = $val['size'];
            $sha256 = $val['sha256'];
            $mime = $val['mime'];
            $ext = $val['ext'];

            $ins = $conn->prepare("
                INSERT INTO `dms_documents` (`uuid`, `lead_id`, `category_code`, `doc_type_code`, `original_name`, `stored_name`, `file_path`, `extension`, `mime_type`, `file_size`, `checksum_sha256`, `uploader_id`, `version_number`, `verification_status`, `expiry_date`, `remarks`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending', ?, ?)
            ");
            if ($ins) {
                $ins->bind_param("sisssssssisisss", $uuid, $lead_id, $cat_code, $doc_type_code, $origName, $stored_name, $dest_path, $ext, $mime, $fileSize, $sha256, $uid, $expiry_date, $remarks);
                $ins->execute();
                $finalDocId = $ins->insert_id;
                $ins->close();
            } else {
                dms_json_error("Database error: Unable to record document.");
            }

            // Also record initial version in dms_document_versions
            $stmtH = $conn->prepare("INSERT INTO `dms_document_versions` (`document_id`, `version_number`, `original_name`, `stored_name`, `file_path`, `file_size`, `checksum_sha256`, `uploader_id`, `change_reason`) VALUES (?, 1, ?, ?, ?, ?, ?, ?, 'Initial upload')");
            if ($stmtH && isset($finalDocId)) {
                $stmtH->bind_param("isssisi", $finalDocId, $origName, $stored_name, $dest_path, $fileSize, $sha256, $uid);
                $stmtH->execute();
                $stmtH->close();
            }

            dms_log_audit($conn, $finalDocId, 'Upload', '', $origName, "Initial upload of type {$doc_type_code}");
            log_lead_action($conn, $lead_id, 'Document Uploaded', "Uploaded document: " . strtoupper($doc_type_code) . " ({$origName})", $uid);
        }

        // Sync with legacy lead_documents table
        dms_sync_lead_documents($conn, $lead_id, $doc_type_code, $dest_path, 'pending', $remarks);

        $docRow = db_fetch_one($conn, "SELECT * FROM `dms_documents` WHERE id = ?", 'i', [$finalDocId]);
        $docRow['download_url'] = dms_generate_signed_url($finalDocId, $uuid, 'download');
        $docRow['preview_url']  = dms_generate_signed_url($finalDocId, $uuid, 'preview');

        dms_json_response([
            'message' => "Document successfully uploaded (v{$version_number}).",
            'document' => $docRow
        ]);
        break;

    // ----------------------------------------------------
    // 5. MULTI-STAGE VERIFICATION WORKFLOW
    // ----------------------------------------------------
    case 'verify':
        dms_require_login();
        if ($method !== 'POST') dms_json_error("Method not allowed", 405);
        if (!is_admin() && !is_manager()) dms_json_error("Only Admins and Managers can verify documents.", 403);

        $doc_id = intval($input['id'] ?? ($input['document_id'] ?? 0));
        $new_status = trim($input['status'] ?? '');
        $action_taken = trim($input['action_taken'] ?? '');
        $reason = trim($input['reason'] ?? '');
        $notes = trim($input['notes'] ?? '');

        if ($doc_id <= 0) dms_json_error("Document ID is required.");

        $valid_statuses = ['pending', 'under_review', 'verified', 'rejected', 'requires_reupload', 'expired'];
        if (!in_array($new_status, $valid_statuses)) {
            if ($action_taken === 'Approve') $new_status = 'verified';
            elseif ($action_taken === 'Reject') $new_status = 'rejected';
            elseif ($action_taken === 'Request Re-upload') $new_status = 'requires_reupload';
            else dms_json_error("Invalid verification status.");
        }

        if (empty($action_taken)) {
            $actionMap = [
                'verified' => 'Approve',
                'rejected' => 'Reject',
                'requires_reupload' => 'Request Re-upload',
                'under_review' => 'Under Review',
                'expired' => 'Mark Expired'
            ];
            $action_taken = $actionMap[$new_status] ?? 'Update Verification';
        }

        $doc = db_fetch_one($conn, "SELECT * FROM `dms_documents` WHERE id = ?", 'i', [$doc_id]);
        if (!$doc) dms_json_error("Document not found.");

        $old_status = $doc['verification_status'];
        $uid = current_user_id();
        $role = current_role();

        $upd = $conn->prepare("UPDATE `dms_documents` SET verification_status = ?, verification_notes = ?, verifier_id = ?, verified_at = NOW() WHERE id = ?");
        if ($upd) {
            $upd->bind_param("ssii", $new_status, $notes, $uid, $doc_id);
            $upd->execute();
            $upd->close();
        }

        // Record verification history
        $insH = $conn->prepare("INSERT INTO `dms_verification_history` (`document_id`, `verifier_id`, `verifier_role`, `old_status`, `new_status`, `action_taken`, `reason`, `notes`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        if ($insH) {
            $insH->bind_param("iissssss", $doc_id, $uid, $role, $old_status, $new_status, $action_taken, $reason, $notes);
            $insH->execute();
            $insH->close();
        }

        // Sync legacy lead_documents
        dms_sync_lead_documents($conn, $doc['lead_id'], $doc['doc_type_code'], $doc['file_path'], $new_status, $notes);

        dms_log_audit($conn, $doc_id, 'Verify', $old_status, $new_status, "Action: {$action_taken}" . ($reason ? " | Reason: {$reason}" : ""));
        log_lead_action($conn, $doc['lead_id'], 'Document Verified (' . strtoupper($new_status) . ')', "Document '{$doc['original_name']}' ({$doc['doc_type_code']}) -> {$action_taken}" . ($notes ? ". Notes: {$notes}" : ""), $uid);

        dms_json_response(['message' => "Document status updated to " . strtoupper(str_replace('_', ' ', $new_status)) . "."]);
        break;

    // ----------------------------------------------------
    // 6. VERSION TIMELINE & ROLLBACK
    // ----------------------------------------------------
    case 'versions':
        dms_require_login();
        $doc_id = intval($_GET['document_id'] ?? ($_GET['id'] ?? 0));
        if ($doc_id <= 0) dms_json_error("Document ID is required.");

        $doc = db_fetch_one($conn, "SELECT d.*, u.name as uploader_name FROM `dms_documents` d LEFT JOIN `users` u ON d.uploader_id = u.id WHERE d.id = ?", 'i', [$doc_id]);
        if (!$doc) dms_json_error("Document not found.");

        $history = db_fetch_all($conn, "SELECT dv.*, u.name as uploader_name FROM `dms_document_versions` dv LEFT JOIN `users` u ON dv.uploader_id = u.id WHERE dv.document_id = ? ORDER BY dv.version_number DESC", 'i', [$doc_id]);
        
        foreach ($history as &$ver) {
            $ver['download_url'] = dms_generate_signed_url($doc_id, $doc['uuid'], 'download');
        }

        dms_json_response([
            'current_version' => $doc,
            'history' => $history
        ]);
        break;

    case 'rollback':
        dms_require_login();
        if ($method !== 'POST') dms_json_error("Method not allowed", 405);
        if (!is_admin() && !is_manager()) dms_json_error("Only Admins and Managers can rollback document versions.", 403);

        $doc_id = intval($input['document_id'] ?? ($input['id'] ?? 0));
        $target_ver = intval($input['version_number'] ?? 0);

        if ($doc_id <= 0 || $target_ver <= 0) dms_json_error("Document ID and target version number are required.");

        $doc = db_fetch_one($conn, "SELECT * FROM `dms_documents` WHERE id = ?", 'i', [$doc_id]);
        $target = db_fetch_one($conn, "SELECT * FROM `dms_document_versions` WHERE document_id = ? AND version_number = ?", 'ii', [$doc_id, $target_ver]);

        if (!$doc || !$target) dms_json_error("Target version not found in history.");
        if (intval($doc['version_number']) === $target_ver) dms_json_error("Document is already at version v{$target_ver}.");

        $newVer = intval($doc['version_number']) + 1;
        $uid = current_user_id();

        // Archive current into history table first
        $stmtH = $conn->prepare("INSERT INTO `dms_document_versions` (`document_id`, `version_number`, `original_name`, `stored_name`, `file_path`, `file_size`, `checksum_sha256`, `uploader_id`, `change_reason`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if ($stmtH) {
            $vOld = intval($doc['version_number']);
            $reason = "Rollback prior state before restoring v{$target_ver}";
            $stmtH->bind_param("iisssisis", $doc_id, $vOld, $doc['original_name'], $doc['stored_name'], $doc['file_path'], $doc['file_size'], $doc['checksum_sha256'], $doc['uploader_id'], $reason);
            $stmtH->execute();
            $stmtH->close();
        }

        // Update main table with target version's file info
        $upd = $conn->prepare("UPDATE `dms_documents` SET original_name = ?, stored_name = ?, file_path = ?, file_size = ?, checksum_sha256 = ?, uploader_id = ?, version_number = ?, verification_status = 'under_review' WHERE id = ?");
        if ($upd) {
            $upd->bind_param("sssisiii", $target['original_name'], $target['stored_name'], $target['file_path'], $target['file_size'], $target['checksum_sha256'], $uid, $newVer, $doc_id);
            $upd->execute();
            $upd->close();
        }

        // Sync legacy lead_documents
        dms_sync_lead_documents($conn, $doc['lead_id'], $doc['doc_type_code'], $target['file_path'], 'under_review', "Rolled back to v{$target_ver}");

        dms_log_audit($conn, $doc_id, 'Restore/Rollback', "v{$doc['version_number']}", "v{$newVer} (restored from v{$target_ver})", "Admin rollback");
        log_lead_action($conn, $doc['lead_id'], 'Document Rolled Back', "Rolled back '{$doc['original_name']}' to version v{$target_ver}", $uid);

        dms_json_response(['message' => "Successfully rolled back document to version v{$target_ver} (Saved as v{$newVer})."]);
        break;

    // ----------------------------------------------------
    // 7. SECURE PREVIEW & DOWNLOAD (SIGNED URL OR SESSION)
    // ----------------------------------------------------
    case 'preview':
    case 'download':
        $doc_id = intval($_GET['id'] ?? 0);
        $token  = trim($_GET['token'] ?? '');
        $expires = intval($_GET['expires'] ?? 0);

        $doc = db_fetch_one($conn, "SELECT * FROM `dms_documents` WHERE id = ?", 'i', [$doc_id]);
        if (!$doc) {
            http_response_code(404);
            die("Document not found.");
        }

        // Verify either via signed token OR active session
        $authorized = false;
        if (!empty($token) && $expires > 0) {
            $authorized = dms_verify_signed_url($doc_id, $doc['uuid'], $action, $expires, $token);
        }
        if (!$authorized && is_logged_in()) {
            if (current_role() !== 'staff') {
                $authorized = true;
            }
        }

        if (!$authorized) {
            http_response_code(403);
            die("Access denied. Token expired or unauthorized.");
        }

        $filePath = dirname(__DIR__) . '/' . $doc['file_path'];
        if (!file_exists($filePath)) {
            // Try legacy uploads directory if relative path mismatch
            $filePath = dirname(__DIR__) . '/' . preg_replace('/^uploads\//', 'uploads/', $doc['file_path']);
            if (!file_exists($filePath)) {
                http_response_code(404);
                die("Physical file missing on server disk.");
            }
        }

        // Increment access counters and audit log
        if ($action === 'preview') {
            $conn->query("UPDATE `dms_documents` SET preview_count = preview_count + 1 WHERE id = {$doc_id}");
            dms_log_audit($conn, $doc_id, 'Preview', '', $doc['original_name'], "Previewed via browser");
        } else {
            $conn->query("UPDATE `dms_documents` SET download_count = download_count + 1 WHERE id = {$doc_id}");
            dms_log_audit($conn, $doc_id, 'Download', '', $doc['original_name'], "Downloaded file");
        }

        $mime = $doc['mime_type'] ?: 'application/octet-stream';
        header("Content-Type: {$mime}");
        header("Content-Length: " . filesize($filePath));
        
        if ($action === 'download') {
            header('Content-Disposition: attachment; filename="' . addslashes($doc['original_name']) . '"');
        } else {
            header('Content-Disposition: inline; filename="' . addslashes($doc['original_name']) . '"');
        }
        header("Cache-Control: private, max-age=3600");
        readfile($filePath);
        exit;

    // ----------------------------------------------------
    // 8. SOFT DELETE & RESTORE
    // ----------------------------------------------------
    case 'delete':
        dms_require_login();
        if ($method !== 'DELETE' && $method !== 'POST') dms_json_error("Method not allowed", 405);
        if (!is_admin() && !is_manager()) dms_json_error("Only Admins and Managers can archive documents.", 403);

        $doc_id = intval($_GET['id'] ?? ($input['id'] ?? 0));
        $reason = trim($input['reason'] ?? 'Archived by user');

        $doc = db_fetch_one($conn, "SELECT * FROM `dms_documents` WHERE id = ?", 'i', [$doc_id]);
        if (!$doc) dms_json_error("Document not found.");

        $conn->query("UPDATE `dms_documents` SET is_deleted = 1, verification_status = 'rejected', verification_notes = CONCAT(IFNULL(verification_notes,''), ' [Archived: {$reason}]') WHERE id = {$doc_id}");
        
        dms_sync_lead_documents($conn, $doc['lead_id'], $doc['doc_type_code'], $doc['file_path'], 'rejected', 'Archived / Removed by user');
        dms_log_audit($conn, $doc_id, 'Delete/Archive', 'Active', 'Archived (Soft Delete)', $reason);
        log_lead_action($conn, $doc['lead_id'], 'Document Archived', "Archived document: '{$doc['original_name']}' ({$doc['doc_type_code']})", current_user_id());

        dms_json_response(['message' => 'Document archived successfully. Audit trail preserved.']);
        break;

    case 'restore':
        dms_require_login();
        if ($method !== 'POST') dms_json_error("Method not allowed", 405);
        if (!is_admin() && !is_manager()) dms_json_error("Only Admins and Managers can restore archived documents.", 403);

        $doc_id = intval($input['id'] ?? 0);
        $doc = db_fetch_one($conn, "SELECT * FROM `dms_documents` WHERE id = ?", 'i', [$doc_id]);
        if (!$doc) dms_json_error("Document not found.");

        $conn->query("UPDATE `dms_documents` SET is_deleted = 0, verification_status = 'pending' WHERE id = {$doc_id}");
        
        dms_sync_lead_documents($conn, $doc['lead_id'], $doc['doc_type_code'], $doc['file_path'], 'pending', 'Restored from archive');
        dms_log_audit($conn, $doc_id, 'Restore', 'Archived', 'Active (Pending)', 'Restored by Admin');
        log_lead_action($conn, $doc['lead_id'], 'Document Restored', "Restored document: '{$doc['original_name']}' ({$doc['doc_type_code']})", current_user_id());

        dms_json_response(['message' => 'Document restored successfully to active vault.']);
        break;

    // ----------------------------------------------------
    // 9. EXPIRY MONITORING & ALERTS
    // ----------------------------------------------------
    case 'expiries':
        dms_require_login();
        dms_run_expiry_check($conn);

        $sql = "
            SELECT d.*, c.name as category_name, dt.name as doc_type_name, l.lead_id as lead_code, l.customer_name, l.mobile
            FROM `dms_documents` d
            LEFT JOIN `dms_categories` c ON d.category_code = c.code
            LEFT JOIN `dms_document_types` dt ON d.doc_type_code = dt.code
            LEFT JOIN `leads` l ON d.lead_id = l.id
            WHERE d.expiry_date IS NOT NULL AND d.is_deleted = 0
              AND d.expiry_date <= (CURDATE() + INTERVAL 30 DAY)
            ORDER BY d.expiry_date ASC
        ";
        $rows = db_fetch_all($conn, $sql);

        $grouped = [
            'expired' => [],
            'day_1' => [],
            'days_7' => [],
            'days_15' => [],
            'days_30' => []
        ];

        $today = new DateTime('today');
        foreach ($rows as $r) {
            $exp = new DateTime($r['expiry_date']);
            $diff = (int)$today->diff($exp)->format('%r%a');

            if ($diff < 0 || $r['verification_status'] === 'expired') {
                $grouped['expired'][] = $r;
            } elseif ($diff <= 1) {
                $grouped['day_1'][] = $r;
            } elseif ($diff <= 7) {
                $grouped['days_7'][] = $r;
            } elseif ($diff <= 15) {
                $grouped['days_15'][] = $r;
            } else {
                $grouped['days_30'][] = $r;
            }
        }

        dms_json_response(['expiries' => $grouped, 'total_alerts' => count($rows)]);
        break;

    // ----------------------------------------------------
    // 10. AUDIT TRAILS & VERIFICATION HISTORY
    // ----------------------------------------------------
    case 'audit_logs':
        dms_require_login();
        $doc_id = intval($_GET['document_id'] ?? ($_GET['id'] ?? 0));
        $lead_id = intval($_GET['lead_id'] ?? 0);

        $where = ["1=1"];
        $params = [];
        $types = "";

        if ($doc_id > 0) {
            $where[] = "al.document_id = ?";
            $params[] = $doc_id;
            $types .= "i";
        } elseif ($lead_id > 0) {
            $where[] = "al.document_id IN (SELECT id FROM dms_documents WHERE lead_id = ?)";
            $params[] = $lead_id;
            $types .= "i";
        }

        $sql = "
            SELECT al.*, u.name as user_name, d.original_name as document_name, d.doc_type_code
            FROM `dms_audit_logs` al
            LEFT JOIN `users` u ON al.user_id = u.id
            LEFT JOIN `dms_documents` d ON al.document_id = d.id
            WHERE " . implode(" AND ", $where) . "
            ORDER BY al.created_at DESC, al.id DESC LIMIT 150
        ";

        if (!empty($params)) {
            $logs = db_fetch_all($conn, $sql, $types, $params);
        } else {
            $logs = db_fetch_all($conn, $sql);
        }

        dms_json_response(['audit_logs' => $logs]);
        break;

    // ----------------------------------------------------
    // 11. BULK OPERATIONS
    // ----------------------------------------------------
    case 'bulk':
        dms_require_login();
        if ($method !== 'POST') dms_json_error("Method not allowed", 405);
        if (!is_admin() && !is_manager()) dms_json_error("Only Admins and Managers can perform bulk operations.", 403);

        $operation = trim($input['operation'] ?? '');
        $doc_ids = $input['document_ids'] ?? [];
        $notes = trim($input['notes'] ?? 'Bulk action by Admin');

        if (!is_array($doc_ids) || empty($doc_ids)) {
            dms_json_error("No documents selected.");
        }

        $cleanIds = array_map('intval', $doc_ids);
        $inClause = implode(',', $cleanIds);
        $uid = current_user_id();

        if ($operation === 'bulk_verify') {
            $conn->query("UPDATE `dms_documents` SET verification_status = 'verified', verification_notes = '{$notes}', verifier_id = {$uid}, verified_at = NOW() WHERE id IN ({$inClause})");
            foreach ($cleanIds as $id) {
                dms_log_audit($conn, $id, 'Bulk Verify', 'pending', 'verified', $notes);
                $d = db_fetch_one($conn, "SELECT lead_id, doc_type_code, file_path FROM dms_documents WHERE id = {$id}");
                if ($d) dms_sync_lead_documents($conn, $d['lead_id'], $d['doc_type_code'], $d['file_path'], 'verified', $notes);
            }
            dms_json_response(['message' => "Successfully verified " . count($cleanIds) . " documents."]);
        } elseif ($operation === 'bulk_reject') {
            $conn->query("UPDATE `dms_documents` SET verification_status = 'rejected', verification_notes = '{$notes}', verifier_id = {$uid}, verified_at = NOW() WHERE id IN ({$inClause})");
            foreach ($cleanIds as $id) {
                dms_log_audit($conn, $id, 'Bulk Reject', 'pending', 'rejected', $notes);
                $d = db_fetch_one($conn, "SELECT lead_id, doc_type_code, file_path FROM dms_documents WHERE id = {$id}");
                if ($d) dms_sync_lead_documents($conn, $d['lead_id'], $d['doc_type_code'], $d['file_path'], 'rejected', $notes);
            }
            dms_json_response(['message' => "Successfully rejected " . count($cleanIds) . " documents."]);
        } elseif ($operation === 'bulk_archive') {
            $conn->query("UPDATE `dms_documents` SET is_deleted = 1, verification_status = 'rejected', verification_notes = 'Archived via Bulk Operation' WHERE id IN ({$inClause})");
            foreach ($cleanIds as $id) {
                dms_log_audit($conn, $id, 'Bulk Archive', 'Active', 'Archived', $notes);
            }
            dms_json_response(['message' => "Successfully archived " . count($cleanIds) . " documents."]);
        } elseif ($operation === 'bulk_restore') {
            $conn->query("UPDATE `dms_documents` SET is_deleted = 0, verification_status = 'pending' WHERE id IN ({$inClause})");
            foreach ($cleanIds as $id) {
                dms_log_audit($conn, $id, 'Bulk Restore', 'Archived', 'Active', $notes);
            }
            dms_json_response(['message' => "Successfully restored " . count($cleanIds) . " documents."]);
        } else {
            dms_json_error("Unknown bulk operation.");
        }
        break;

    // ----------------------------------------------------
    // 12. DASHBOARD KPIs & ANALYTICS
    // ----------------------------------------------------
    case 'stats':
        dms_require_login();
        dms_run_expiry_check($conn);

        $kpis = [
            'total_documents' => 0,
            'pending_verification' => 0,
            'verified' => 0,
            'rejected' => 0,
            'expired' => 0,
            'reupload_required' => 0,
            'storage_usage_bytes' => 0,
            'today_uploads' => 0,
            'monthly_uploads' => 0,
            'average_verification_time_mins' => 12 // default/calculated
        ];

        $resSum = $conn->query("
            SELECT 
                COUNT(*) as total,
                SUM(IF(verification_status = 'pending' OR verification_status = 'under_review', 1, 0)) as pending,
                SUM(IF(verification_status = 'verified', 1, 0)) as verified,
                SUM(IF(verification_status = 'rejected', 1, 0)) as rejected,
                SUM(IF(verification_status = 'expired', 1, 0)) as expired,
                SUM(IF(verification_status = 'requires_reupload', 1, 0)) as reupload,
                SUM(file_size) as storage_bytes,
                SUM(IF(DATE(created_at) = CURDATE(), 1, 0)) as today_count,
                SUM(IF(YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()), 1, 0)) as month_count
            FROM `dms_documents` WHERE is_deleted = 0
        ");
        if ($resSum && $r = $resSum->fetch_assoc()) {
            $kpis['total_documents'] = (int)$r['total'];
            $kpis['pending_verification'] = (int)$r['pending'];
            $kpis['verified'] = (int)$r['verified'];
            $kpis['rejected'] = (int)$r['rejected'];
            $kpis['expired'] = (int)$r['expired'];
            $kpis['reupload_required'] = (int)$r['reupload'];
            $kpis['storage_usage_bytes'] = (int)$r['storage_bytes'];
            $kpis['today_uploads'] = (int)$r['today_count'];
            $kpis['monthly_uploads'] = (int)$r['month_count'];
        }

        // Calculate Average Verification Time in minutes from verification history
        $resAvg = $conn->query("SELECT AVG(TIMESTAMPDIFF(MINUTE, d.created_at, h.created_at)) as avg_mins FROM `dms_verification_history` h JOIN `dms_documents` d ON h.document_id = d.id WHERE h.new_status = 'verified'");
        if ($resAvg && $rAvg = $resAvg->fetch_assoc()) {
            if (!empty($rAvg['avg_mins'])) {
                $kpis['average_verification_time_mins'] = round((float)$rAvg['avg_mins']);
            }
        }

        // Category distribution chart
        $catDist = db_fetch_all($conn, "
            SELECT c.name as category_name, COUNT(d.id) as count
            FROM `dms_categories` c
            LEFT JOIN `dms_documents` d ON c.code = d.category_code AND d.is_deleted = 0
            WHERE c.is_active = 1
            GROUP BY c.code, c.name
            ORDER BY count DESC
        ");

        // Upload trends (last 7 days)
        $trends = db_fetch_all($conn, "
            SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as upload_date, COUNT(*) as count
            FROM `dms_documents`
            WHERE created_at >= (CURDATE() - INTERVAL 7 DAY) AND is_deleted = 0
            GROUP BY upload_date
            ORDER BY upload_date ASC
        ");

        // Executive performance
        $execPerf = db_fetch_all($conn, "
            SELECT u.name as executive_name, COUNT(d.id) as uploads_count, SUM(IF(d.verification_status='verified',1,0)) as verified_count
            FROM `dms_documents` d
            JOIN `users` u ON d.uploader_id = u.id
            WHERE d.is_deleted = 0
            GROUP BY u.id, u.name
            ORDER BY uploads_count DESC LIMIT 10
        ");

        dms_json_response([
            'kpis' => $kpis,
            'category_distribution' => $catDist,
            'upload_trends' => $trends,
            'executive_performance' => $execPerf
        ]);
        break;

    default:
        dms_json_error("Invalid or missing action ({$action}).", 400);
}

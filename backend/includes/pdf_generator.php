<?php
require_once __DIR__ . '/../vendor/autoload.php';

use setasign\Fpdi\Fpdi;

/**
 * Generates a single PDF containing multiple documents for a lead.
 * 
 * @param mysqli $conn Database connection
 * @param int $lead_id Lead ID
 * @param array|null $doc_ids Array of document IDs to include. If null, includes all active documents for the lead.
 * @return array ['success' => bool, 'output_path' => string, 'output_filename' => string, 'error' => string]
 */
function generate_documents_pdf($conn, $lead_id, $doc_ids = null) {
    if ($doc_ids === null) {
        // Fetch all active documents for this lead
        $stmt = $conn->prepare("SELECT file_path, original_name FROM `dms_documents` WHERE lead_id = ? AND is_deleted = 0");
        $stmt->bind_param('i', $lead_id);
    } else {
        if (empty($doc_ids)) {
            return ['success' => false, 'error' => 'No document IDs provided.'];
        }
        $placeholders = implode(',', array_fill(0, count($doc_ids), '?'));
        $types = str_repeat('i', count($doc_ids)) . 'i';
        $stmt = $conn->prepare("SELECT file_path, original_name FROM `dms_documents` WHERE id IN ($placeholders) AND lead_id = ? AND is_deleted = 0");
        $bind_params = array_merge($doc_ids, [$lead_id]);
        $stmt->bind_param($types, ...$bind_params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $documents = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    if (empty($documents)) {
        return ['success' => false, 'error' => 'No valid documents found.'];
    }

    $exports_dir = __DIR__ . '/../uploads/exports';
    if (!is_dir($exports_dir)) {
        mkdir($exports_dir, 0755, true);
    }

    $pdf = new Fpdi();
    $base_dir = __DIR__ . '/../';
    $has_pages = false;

    foreach ($documents as $doc) {
        $file_path = $base_dir . $doc['file_path'];
        if (!file_exists($file_path)) continue;

        $ext = strtolower(pathinfo($file_path, PATHINFO_EXTENSION));

        if ($ext === 'pdf') {
            try {
                $pageCount = $pdf->setSourceFile($file_path);
                for ($i = 1; $i <= $pageCount; $i++) {
                    $tplId = $pdf->importPage($i);
                    $size = $pdf->getTemplateSize($tplId);
                    
                    $orientation = $size['width'] > $size['height'] ? 'L' : 'P';
                    $pdf->AddPage($orientation, [$size['width'], $size['height']]);
                    $pdf->useTemplate($tplId);
                    $has_pages = true;
                }
            } catch (\Exception $e) {
                error_log("Failed to import PDF $file_path: " . $e->getMessage());
            }
        } else if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
            try {
                if ($ext === 'webp') {
                    $im = imagecreatefromwebp($file_path);
                    $tmp_jpg = tempnam(sys_get_temp_dir(), 'webp') . '.jpg';
                    imagejpeg($im, $tmp_jpg, 100);
                    imagedestroy($im);
                    $file_path = $tmp_jpg;
                    $ext = 'jpg';
                }

                $size = getimagesize($file_path);
                if ($size !== false) {
                    $width_px = $size[0];
                    $height_px = $size[1];
                    
                    $width_mm = $width_px * 0.264583;
                    $height_mm = $height_px * 0.264583;

                    $max_w = 210; 
                    $max_h = 297; 
                    
                    $orientation = $width_mm > $height_mm ? 'L' : 'P';
                    if ($orientation === 'L') {
                        $max_w = 297;
                        $max_h = 210;
                    }

                    $scale = min($max_w / $width_mm, $max_h / $height_mm);
                    if ($scale < 1) {
                        $width_mm *= $scale;
                        $height_mm *= $scale;
                    }

                    $pdf->AddPage($orientation, [$max_w, $max_h]);
                    $pdf->Image($file_path, 0, 0, $width_mm, $height_mm, strtoupper($ext));
                    $has_pages = true;
                }
            } catch (\Exception $e) {
                error_log("Failed to add image $file_path: " . $e->getMessage());
            }
        }
    }

    if (!$has_pages) {
        return ['success' => false, 'error' => 'Failed to generate PDF. Documents might be missing or corrupted.'];
    }

    $output_filename = 'Lead_' . $lead_id . '_Documents_' . time() . '.pdf';
    $output_path = $exports_dir . '/' . $output_filename;

    try {
        $pdf->Output('F', $output_path);
        return [
            'success' => true,
            'output_path' => $output_path,
            'output_filename' => $output_filename
        ];
    } catch (\Exception $e) {
        return ['success' => false, 'error' => 'Failed to save PDF: ' . $e->getMessage()];
    }
}

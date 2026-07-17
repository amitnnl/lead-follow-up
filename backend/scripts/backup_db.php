<?php
// scripts/backup_db.php
// Automated Database Backup Script

// Restrict access to CLI or local only to prevent unauthorized execution via browser
if (php_sapi_name() !== 'cli' && (!isset($_GET['token']) || $_GET['token'] !== 'cron_secure_123')) {
    http_response_code(403);
    die("Access Denied. Run this script via cron job.");
}

// Adjust path because this is inside scripts/
require_once __DIR__ . '/../includes/db.php';

$backupDir = __DIR__ . '/../backups';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0750, true);
    file_put_contents($backupDir . '/index.php', '<?php exit; ?>');
    file_put_contents($backupDir . '/.htaccess', 'Deny from all');
}

$date = date('Y-m-d_H-i-s');
$filename = $backupDir . '/backup_' . DB_NAME . '_' . $date . '.sql';
$fp = fopen($filename, 'w');

if (!$fp) {
    die("Error: Could not create backup file.");
}

fwrite($fp, "-- Database Backup: " . DB_NAME . "\n");
fwrite($fp, "-- Generated: " . date('Y-m-d H:i:s') . "\n\n");
fwrite($fp, "SET FOREIGN_KEY_CHECKS=0;\n\n");

// Get all tables
$tables = [];
$res = $conn->query("SHOW TABLES");
while ($row = $res->fetch_row()) {
    $tables[] = $row[0];
}

foreach ($tables as $table) {
    // Drop table if exists
    fwrite($fp, "DROP TABLE IF EXISTS `$table`;\n");
    
    // Create table structure
    $res = $conn->query("SHOW CREATE TABLE `$table`");
    $row = $res->fetch_row();
    fwrite($fp, $row[1] . ";\n\n");
    
    // Get data
    $res = $conn->query("SELECT * FROM `$table`");
    $numFields = $res->field_count;
    
    while ($row = $res->fetch_row()) {
        $inserts = [];
        for ($i = 0; $i < $numFields; $i++) {
            if (isset($row[$i])) {
                $inserts[] = "'" . $conn->real_escape_string($row[$i]) . "'";
            } else {
                $inserts[] = "NULL";
            }
        }
        fwrite($fp, "INSERT INTO `$table` VALUES(" . implode(",", $inserts) . ");\n");
    }
    fwrite($fp, "\n");
}

fwrite($fp, "SET FOREIGN_KEY_CHECKS=1;\n");
fclose($fp);

echo "Backup created successfully at {$filename}\n";

// Backup Rotation: Keep only the last 7 days of backups
$files = glob($backupDir . '/backup_*.sql');
$now = time();
$deletedCount = 0;

foreach ($files as $f) {
    if (is_file($f)) {
        if ($now - filemtime($f) >= 60 * 60 * 24 * 7) { // 7 days
            unlink($f);
            $deletedCount++;
        }
    }
}

if ($deletedCount > 0) {
    echo "Cleaned up {$deletedCount} old backup(s).\n";
}

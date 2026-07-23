<?php
$dir = 'c:/xampp/mysql/data/';
$backup = $dir . 'replication_backup_new/';
if (!is_dir($backup)) {
    mkdir($backup, 0777, true);
}
$files = glob($dir . '*.info');
foreach ($files as $file) {
    rename($file, $backup . basename($file));
}
$files = glob($dir . 'mysql-relay-bin*');
foreach ($files as $file) {
    rename($file, $backup . basename($file));
}
$files = glob($dir . 'relay-log*');
foreach ($files as $file) {
    rename($file, $backup . basename($file));
}
echo "Done";
?>

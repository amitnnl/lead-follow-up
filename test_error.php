<?php
$log = @file_get_contents('C:\\xampp\\apache\\logs\\error.log');
if ($log) {
    $lines = explode("\n", $log);
    $last = array_slice($lines, -50);
    echo implode("\n", $last);
} else {
    echo "Could not read log file";
}

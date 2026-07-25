<?php
$originals = [
    '·',
    '©',
    '♻️',
    '═',
    '✨',
    '🚗',
    '▾',
    '✓',
    '✗',
    '⏸️',
    '❌',
    '⏳',
    '–', // En dash
    "\xC2\xA0", // Non-breaking space
    '←',
    '↑',
    '→',
    '↓',
    '↵'
];

$replacements = [];
foreach ($originals as $orig) {
    // Generate the exact mangled sequence by treating the original UTF-8 bytes as Windows-1252,
    // and then re-encoding them into UTF-8.
    $mangled = mb_convert_encoding($orig, 'UTF-8', 'Windows-1252');
    $replacements[$mangled] = $orig;
}

$directory = new RecursiveDirectoryIterator('C:/xampp/htdocs/lead-follow-up/frontend/src');
$iterator = new RecursiveIteratorIterator($directory);

$count = 0;
foreach ($iterator as $file) {
    if ($file->isFile() && (str_ends_with($file->getFilename(), '.tsx') || str_ends_with($file->getFilename(), '.ts') || str_ends_with($file->getFilename(), '.css'))) {
        $content = file_get_contents($file->getPathname());
        if ($content === false) continue;
        
        $original_content = $content;
        $content = str_replace(array_keys($replacements), array_values($replacements), $content);
        
        if ($content !== $original_content) {
            file_put_contents($file->getPathname(), $content);
            echo "Fixed: " . $file->getPathname() . "\n";
            $count++;
        }
    }
}
echo "\nFinished fixing $count files using exact byte mapping.\n";
?>

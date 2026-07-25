<?php
$directory = new RecursiveDirectoryIterator('C:/xampp/htdocs/lead-follow-up/frontend/src');
$iterator = new RecursiveIteratorIterator($directory);

$replacements = [
    'Â·' => '·',
    'Â©' => '©',
    'â™»ï¸ ' => '♻️',
    'â• ' => '═',
    'âœ¨' => '✨',
    'ðŸš—' => '🚗',
    'â–¾' => '▾',
    'âœ“' => '✓',
    'âœ—' => '✗',
    'â ¸ï¸ ' => '⏸️',
    'â Œ' => '❌',
    'âŒ›' => '⏳',
    'â€“' => '–',
    'Â ' => ' ', // Sometimes non-breaking space
];

$count = 0;
foreach ($iterator as $file) {
    if ($file->isFile() && (str_ends_with($file->getFilename(), '.tsx') || str_ends_with($file->getFilename(), '.ts'))) {
        $content = file_get_contents($file->getPathname());
        if ($content === false) continue;
        
        $original = $content;
        $content = str_replace(array_keys($replacements), array_values($replacements), $content);
        
        if ($content !== $original) {
            file_put_contents($file->getPathname(), $content);
            echo "Fixed: " . $file->getPathname() . "\n";
            $count++;
        }
    }
}
echo "\nFinished fixing $count files.\n";
?>

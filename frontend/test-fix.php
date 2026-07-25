<?php
$file = 'C:/xampp/htdocs/lead-follow-up/frontend/src/pages/LandingPage.tsx';
$content = file_get_contents($file);

// Find the corrupted string for debugging
preg_match('/Â©/', $content, $matches1);
echo "Before: " . ($matches1 ? "Found Â©\n" : "Not found\n");

$fixed = mb_convert_encoding($content, 'Windows-1252', 'UTF-8');

preg_match('/©/', $fixed, $matches2);
echo "After: " . ($matches2 ? "Found ©\n" : "Not found\n");

file_put_contents('C:/xampp/htdocs/lead-follow-up/frontend/src/pages/LandingPageTest.tsx', $fixed);
echo "Saved to LandingPageTest.tsx\n";
?>

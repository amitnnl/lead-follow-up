<?php
$str = "Agent ₹ 28,500 Â· Org ₹ 3,166 ... â™»ï¸ Eco-Print Layout â• â• â• â• ";
echo "Original: $str\n";

$fixed = preg_replace_callback('/[ÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ\x80-\xBF]+/', function($matches) {
    $converted = mb_convert_encoding($matches[0], 'Windows-1252', 'UTF-8');
    // Verify it's a valid utf8 after conversion, else return original
    if (mb_check_encoding($converted, 'UTF-8')) {
        return $converted;
    }
    return $matches[0];
}, $str);

echo "Fixed: $fixed\n";

<?php
header('Content-Type: application/json');
require_once __DIR__ . '/includes/db.php';
$base = BASE_URL; // empty string on live domain, '/lead-follow-up' on localhost
echo json_encode([
    "name"             => "LeadFlow Pro — KASPR GROUP",
    "short_name"       => "LeadFlow",
    "description"      => "Vehicle Finance DSA Lead Management System by KASPR GROUP",
    "start_url"        => $base . "/dashboard.php",
    "scope"            => $base . "/",
    "display"          => "standalone",
    "background_color" => "#0b0f19",
    "theme_color"      => "#7c3aed",
    "orientation"      => "portrait-primary",
    "icons"            => [
        [
            "src"     => $base . "/uploads/AppLogo.png",
            "sizes"   => "192x192",
            "type"    => "image/png",
            "purpose" => "any maskable"
        ],
        [
            "src"     => $base . "/uploads/AppLogo.png",
            "sizes"   => "512x512",
            "type"    => "image/png",
            "purpose" => "any maskable"
        ]
    ]
], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

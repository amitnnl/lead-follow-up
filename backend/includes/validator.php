<?php
// includes/validator.php — Strict Input Schema Validation for System Settings

/**
 * Validate configuration inputs against a strict, predefined schema.
 * Reject any unknown settings keys, incorrect types, invalid lengths, or invalid formats.
 * Returns an array of error messages, or an empty array if all validations pass.
 */
function validate_settings_schema(array $input): array {
    $schema = [
        // Rate Limiting (Sliding Window Limits)
        'rate_limit_public_max' => [
            'type' => 'int',
            'min' => 1,
            'max' => 10000,
            'description' => 'Public Endpoint Max Hits'
        ],
        'rate_limit_public_window' => [
            'type' => 'int',
            'min' => 1,
            'max' => 86400,
            'description' => 'Public Window (seconds)'
        ],
        'rate_limit_authenticated_max' => [
            'type' => 'int',
            'min' => 1,
            'max' => 10000,
            'description' => 'Authenticated Endpoint Max Hits'
        ],
        'rate_limit_authenticated_window' => [
            'type' => 'int',
            'min' => 1,
            'max' => 86400,
            'description' => 'Authenticated Window (seconds)'
        ],
        'rate_limit_auth_max' => [
            'type' => 'int',
            'min' => 1,
            'max' => 10000,
            'description' => 'Auth Endpoint Max Hits'
        ],
        'rate_limit_auth_window' => [
            'type' => 'int',
            'min' => 1,
            'max' => 86400,
            'description' => 'Auth Window (seconds)'
        ],
        
        // Cooldown & Authentication Backoff
        'auth_backoff_threshold_ip' => [
            'type' => 'int',
            'min' => 1,
            'max' => 50,
            'description' => 'IP Failed Attempts Threshold'
        ],
        'auth_backoff_threshold_acc' => [
            'type' => 'int',
            'min' => 1,
            'max' => 50,
            'description' => 'Account Failed Attempts Threshold'
        ],
        'auth_backoff_base_seconds' => [
            'type' => 'int',
            'min' => 1,
            'max' => 3600,
            'description' => 'Base Cooldown Delay'
        ],
        'auth_backoff_factor' => [
            'type' => 'float',
            'min' => 1.0,
            'max' => 10.0,
            'description' => 'Cooldown Factor'
        ],
        'auth_backoff_decay_minutes' => [
            'type' => 'int',
            'min' => 1,
            'max' => 1440,
            'description' => 'Failed Attempts Cache Expiry'
        ],
        'max_upload_size_mb' => [
            'type' => 'int',
            'min' => 1,
            'max' => 100,
            'description' => 'Max Upload Size (MB)'
        ],

        // Branding & General System Configuration
        'app_name' => [
            'type' => 'string',
            'min_len' => 2,
            'max_len' => 50,
            'description' => 'App Name'
        ],
        'company_name' => [
            'type' => 'string',
            'min_len' => 2,
            'max_len' => 100,
            'description' => 'Company Name'
        ],
        'support_email' => [
            'type' => 'email',
            'max_len' => 150,
            'description' => 'Support Email'
        ],
        'contact_number' => [
            'type' => 'phone',
            'max_len' => 20,
            'description' => 'Contact Number'
        ],
        'whatsapp_number' => [
            'type' => 'phone',
            'max_len' => 20,
            'description' => 'WhatsApp Number'
        ],
        'office_address' => [
            'type' => 'string',
            'min_len' => 5,
            'max_len' => 500,
            'description' => 'Office Address'
        ],
        'default_currency' => [
            'type' => 'string',
            'min_len' => 3,
            'max_len' => 3,
            'description' => 'Default Currency'
        ],
        'system_timezone' => [
            'type' => 'timezone',
            'description' => 'Timezone'
        ],
        'session_timeout' => [
            'type' => 'int',
            'min' => 5,
            'max' => 1440,
            'description' => 'Session Timeout (Minutes)'
        ],
        'maintenance_mode' => [
            'type' => 'flag',
            'description' => 'Maintenance Mode'
        ],

        // Financial Defaults
        'default_tds_rate' => [
            'type' => 'float',
            'min' => 0.0,
            'max' => 100.0,
            'description' => 'Default TDS Rate (%)'
        ],
        'default_processing_fee' => [
            'type' => 'float',
            'min' => 0.0,
            'max' => 1000000.0,
            'description' => 'Default Processing Fee'
        ],

        // Lead Workflow
        'default_lead_status' => [
            'type' => 'option',
            'options' => ['New', 'Pending Document', 'Follow-up'],
            'description' => 'Default Lead Status'
        ],
        'followup_sla_days' => [
            'type' => 'int',
            'min' => 1,
            'max' => 365,
            'description' => 'Follow-up SLA (Days)'
        ],

        // SMTP Server Credentials
        'smtp_host' => [
            'type' => 'string_empty_ok',
            'max_len' => 150,
            'description' => 'SMTP Host'
        ],
        'smtp_port' => [
            'type' => 'int',
            'min' => 1,
            'max' => 65535,
            'description' => 'SMTP Port'
        ],
        'smtp_user' => [
            'type' => 'string_empty_ok',
            'max_len' => 150,
            'description' => 'SMTP Username'
        ],
        'smtp_pass' => [
            'type' => 'string_empty_ok',
            'max_len' => 150,
            'description' => 'SMTP Password'
        ],

        // Social Media official page links
        'instagram_url' => [
            'type' => 'url',
            'max_len' => 255,
            'description' => 'Instagram URL'
        ],
        'facebook_url' => [
            'type' => 'url',
            'max_len' => 255,
            'description' => 'Facebook URL'
        ],
        'linkedin_url' => [
            'type' => 'url',
            'max_len' => 255,
            'description' => 'LinkedIn URL'
        ],
        'twitter_url' => [
            'type' => 'url',
            'max_len' => 255,
            'description' => 'Twitter URL'
        ],

        // Website Hero Slideshow
        'slide1_title' => ['type' => 'string', 'min_len' => 3, 'max_len' => 150, 'description' => 'Slide 1 Title'],
        'slide1_badge' => ['type' => 'string', 'min_len' => 3, 'max_len' => 50, 'description' => 'Slide 1 Badge'],
        'slide1_description' => ['type' => 'string', 'min_len' => 10, 'max_len' => 500, 'description' => 'Slide 1 Description'],
        'slide2_title' => ['type' => 'string', 'min_len' => 3, 'max_len' => 150, 'description' => 'Slide 2 Title'],
        'slide2_badge' => ['type' => 'string', 'min_len' => 3, 'max_len' => 50, 'description' => 'Slide 2 Badge'],
        'slide2_description' => ['type' => 'string', 'min_len' => 10, 'max_len' => 500, 'description' => 'Slide 2 Description'],
        'slide3_title' => ['type' => 'string', 'min_len' => 3, 'max_len' => 150, 'description' => 'Slide 3 Title'],
        'slide3_badge' => ['type' => 'string', 'min_len' => 3, 'max_len' => 50, 'description' => 'Slide 3 Badge'],
        'slide3_description' => ['type' => 'string', 'min_len' => 10, 'max_len' => 500, 'description' => 'Slide 3 Description'],
        'slide4_title' => ['type' => 'string', 'min_len' => 3, 'max_len' => 150, 'description' => 'Slide 4 Title'],
        'slide4_badge' => ['type' => 'string', 'min_len' => 3, 'max_len' => 50, 'description' => 'Slide 4 Badge'],
        'slide4_description' => ['type' => 'string', 'min_len' => 10, 'max_len' => 500, 'description' => 'Slide 4 Description'],
    ];

    $errors = [];

    foreach ($input as $key => $value) {
        // Reject unknown parameters
        if (!isset($schema[$key])) {
            $errors[] = "Unknown configuration setting: " . htmlspecialchars($key);
            continue;
        }

        $rules = $schema[$key];
        $desc = $rules['description'];

        switch ($rules['type']) {
            case 'int':
                if (!is_numeric($value) || intval($value) != $value) {
                    $errors[] = "$desc must be an integer.";
                } else {
                    $valInt = intval($value);
                    if (isset($rules['min']) && $valInt < $rules['min']) {
                        $errors[] = "$desc must be at least {$rules['min']}.";
                    }
                    if (isset($rules['max']) && $valInt > $rules['max']) {
                        $errors[] = "$desc cannot be greater than {$rules['max']}.";
                    }
                }
                break;

            case 'float':
                if (!is_numeric($value)) {
                    $errors[] = "$desc must be a numeric value.";
                } else {
                    $valFloat = floatval($value);
                    if (isset($rules['min']) && $valFloat < $rules['min']) {
                        $errors[] = "$desc must be at least {$rules['min']}.";
                    }
                    if (isset($rules['max']) && $valFloat > $rules['max']) {
                        $errors[] = "$desc cannot be greater than {$rules['max']}.";
                    }
                }
                break;

            case 'string':
                $strVal = strval($value);
                $len = mb_strlen($strVal);
                if (isset($rules['min_len']) && $len < $rules['min_len']) {
                    $errors[] = "$desc must be at least {$rules['min_len']} characters long.";
                }
                if (isset($rules['max_len']) && $len > $rules['max_len']) {
                    $errors[] = "$desc cannot be longer than {$rules['max_len']} characters.";
                }
                break;

            case 'string_empty_ok':
                $strVal = strval($value);
                $len = mb_strlen($strVal);
                if ($len > 0) {
                    if (isset($rules['max_len']) && $len > $rules['max_len']) {
                        $errors[] = "$desc cannot be longer than {$rules['max_len']} characters.";
                    }
                }
                break;

            case 'email':
                $emailVal = trim(strval($value));
                if (!filter_var($emailVal, FILTER_VALIDATE_EMAIL)) {
                    $errors[] = "$desc must be a valid email address.";
                }
                if (isset($rules['max_len']) && strlen($emailVal) > $rules['max_len']) {
                    $errors[] = "$desc cannot be longer than {$rules['max_len']} characters.";
                }
                break;

            case 'url':
                $urlVal = trim(strval($value));
                if (!filter_var($urlVal, FILTER_VALIDATE_URL)) {
                    $errors[] = "$desc must be a valid URL (e.g., https://example.com).";
                }
                if (isset($rules['max_len']) && strlen($urlVal) > $rules['max_len']) {
                    $errors[] = "$desc cannot be longer than {$rules['max_len']} characters.";
                }
                break;

            case 'phone':
                $phoneVal = trim(strval($value));
                // Match common international and local formats
                if (!preg_match('/^\+?[0-9\s\-()]{7,20}$/', $phoneVal)) {
                    $errors[] = "$desc must be a valid phone number.";
                }
                break;

            case 'timezone':
                $tzVal = strval($value);
                if (!in_array($tzVal, timezone_identifiers_list())) {
                    $errors[] = "$desc is not a valid timezone identifier.";
                }
                break;

            case 'flag':
                if ($value !== '0' && $value !== '1' && $value !== 0 && $value !== 1 && $value !== true && $value !== false) {
                    $errors[] = "$desc must be a boolean flag (0 or 1).";
                }
                break;

            case 'option':
                if (!in_array($value, $rules['options'])) {
                    $optionsStr = implode(', ', $rules['options']);
                    $errors[] = "$desc must be one of the following: $optionsStr.";
                }
                break;
        }
    }

    return $errors;
}

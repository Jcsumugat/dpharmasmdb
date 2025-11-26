<?php
/**
 * Save this as: check-config.php in your project root
 * Run: php check-config.php
 */

echo "=== Digital Pharma System - Config Checker ===\n\n";

$configPath = __DIR__ . '/config';

if (!is_dir($configPath)) {
    die("Config directory not found!\n");
}

$files = scandir($configPath);
$errors = [];
$success = [];

foreach ($files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) !== 'php') {
        continue;
    }

    $filePath = $configPath . '/' . $file;
    echo "Checking: {$file}... ";

    try {
        $config = include $filePath;

        if (!is_array($config)) {
            $type = gettype($config);
            echo "❌ ERROR\n";
            $errors[] = [
                'file' => $file,
                'error' => "Returns {$type} instead of array",
                'path' => $filePath
            ];
        } else {
            echo "✓ OK\n";
            $success[] = $file;
        }
    } catch (Throwable $e) {
        echo "❌ EXCEPTION\n";
        $errors[] = [
            'file' => $file,
            'error' => $e->getMessage(),
            'path' => $filePath
        ];
    }
}

echo "\n=== RESULTS ===\n";
echo "Success: " . count($success) . " files\n";
echo "Errors: " . count($errors) . " files\n\n";

if (!empty($errors)) {
    echo "=== ERRORS FOUND ===\n";
    foreach ($errors as $error) {
        echo "\nFile: {$error['file']}\n";
        echo "Error: {$error['error']}\n";
        echo "Path: {$error['path']}\n";
        echo "---\n";
    }

    echo "\n=== FIX INSTRUCTIONS ===\n";
    echo "The config file(s) above must return an array.\n";
    echo "Make sure each file starts with:\n";
    echo "<?php\n\nreturn [\n    // your config here\n];\n";
} else {
    echo "All config files are valid! ✓\n";
}

echo "\n=== Checking for common issues ===\n";

// Check if app.php exists
if (file_exists($configPath . '/app.php')) {
    $content = file_get_contents($configPath . '/app.php');
    if (strpos($content, 'return [') === false && strpos($content, 'return[') === false) {
        echo "⚠ WARNING: config/app.php may be missing 'return' statement\n";
    }
}

// Check if database.php exists
if (file_exists($configPath . '/database.php')) {
    $content = file_get_contents($configPath . '/database.php');
    if (strpos($content, 'return [') === false && strpos($content, 'return[') === false) {
        echo "⚠ WARNING: config/database.php may be missing 'return' statement\n";
    }
}

echo "\nDone!\n";

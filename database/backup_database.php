<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

$backupDir = storage_path('app/backups');
if (!File::exists($backupDir)) {
    File::makeDirectory($backupDir, 0755, true);
}

$timestamp = date('Y_m_d_His');
$backupPath = $backupDir . DIRECTORY_SEPARATOR . "backup_casher_db_{$timestamp}.sql";

echo "بدء أخذ نسخة احتياطية من قاعدة البيانات: " . config('database.connections.mysql.database') . "\n";
echo "الخادم: " . config('database.connections.mysql.host') . ":" . config('database.connections.mysql.port') . "\n";
echo "البيئة: " . app()->environment() . "\n";

$tables = DB::select('SHOW TABLES');
$dbName = config('database.connections.mysql.database');
$keyName = "Tables_in_{$dbName}";

$handle = fopen($backupPath, 'w');
fwrite($handle, "-- النسخة الاحتياطية لقاعدة البيانات: {$dbName}\n");
fwrite($handle, "-- التاريخ: " . date('Y-m-d H:i:s') . "\n");
fwrite($handle, "SET FOREIGN_KEY_CHECKS=0;\n\n");

$totalRows = 0;
foreach ($tables as $tableObj) {
    $table = $tableObj->$keyName;
    fwrite($handle, "-- جدول: `{$table}`\n");
    fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n");
    
    $createTable = DB::select("SHOW CREATE TABLE `{$table}`")[0]->{'Create Table'};
    fwrite($handle, $createTable . ";\n\n");
    
    $rows = DB::table($table)->get();
    if ($rows->count() > 0) {
        $totalRows += $rows->count();
        foreach ($rows->chunk(100) as $chunk) {
            $insertSql = "INSERT INTO `{$table}` VALUES ";
            $valuesArr = [];
            foreach ($chunk as $row) {
                $values = array_map(function ($value) {
                    if (is_null($value)) return 'NULL';
                    return DB::getPdo()->quote($value);
                }, (array) $row);
                $valuesArr[] = "(" . implode(', ', $values) . ")";
            }
            $insertSql .= implode(",\n", $valuesArr) . ";\n";
            fwrite($handle, $insertSql);
        }
    }
    fwrite($handle, "\n");
}

fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
fclose($handle);

$fileSize = filesize($backupPath);
echo "تم حفظ النسخة الاحتياطية بنجاح في:\n{$backupPath}\n";
echo "الحجم: " . round($fileSize / 1024, 2) . " كيلوبايت | إجمالي السجلات المحفوظة: {$totalRows}\n";

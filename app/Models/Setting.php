<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
        'group',
        'description',
        'type',
    ];

    public static function getVal(string $key, $default = null)
    {
        $setting = self::find($key);
        if (!$setting) {
            return $default;
        }

        switch ($setting->type) {
            case 'boolean':
                return filter_var($setting->value, FILTER_VALIDATE_BOOLEAN);
            case 'integer':
                return (int)$setting->value;
            case 'json':
                return json_decode($setting->value, true);
            default:
                return $setting->value;
        }
    }

    public static function setVal(string $key, $value, string $group = 'general', string $type = 'string')
    {
        $val = is_array($value) ? json_encode($value) : (string)$value;
        return self::updateOrCreate(
            ['key' => $key],
            ['value' => $val, 'group' => $group, 'type' => $type]
        );
    }
}

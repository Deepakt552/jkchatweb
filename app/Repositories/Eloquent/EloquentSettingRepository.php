<?php

namespace App\Repositories\Eloquent;

use App\Models\Setting;
use App\Repositories\Contracts\SettingRepositoryInterface;
use Illuminate\Support\Collection;

class EloquentSettingRepository implements SettingRepositoryInterface
{
    public function get(string $key, $default = null)
    {
        return Setting::getVal($key, $default);
    }

    public function set(string $key, $value, string $group = 'general', string $type = 'string')
    {
        return Setting::setVal($key, $value, $group, $type);
    }

    public function allByGroup(string $group): Collection
    {
        return Setting::where('group', $group)->get();
    }

    public function all(): Collection
    {
        return Setting::all();
    }
}

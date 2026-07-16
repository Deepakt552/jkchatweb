<?php

namespace App\Repositories\Contracts;

use Illuminate\Support\Collection;

interface SettingRepositoryInterface
{
    public function get(string $key, $default = null);
    public function set(string $key, $value, string $group = 'general', string $type = 'string');
    public function allByGroup(string $group): Collection;
    public function all(): Collection;
}

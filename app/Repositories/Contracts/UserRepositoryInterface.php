<?php

namespace App\Repositories\Contracts;

use App\Models\User;
use Illuminate\Support\Collection;

interface UserRepositoryInterface
{
    public function findById(int $id): ?User;
    public function findByEmailOrUsername(string $login): ?User;
    public function create(array $data): User;
    public function update(int $id, array $data): User;
    public function delete(int $id): bool;
    public function getAll(): Collection;
    public function search(string $query): Collection;
}

<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'username',
        'avatar_url',
        'about',
        'department',
        'designation',
        'online_status',
        'last_seen_at',
        'privacy_settings',
        'is_enabled',
        'is_suspended',
        'force_password_change',
        'temp_password',
        'is_admin',
    ];

    protected $appends = ['avatar_thumb_url'];

    public function getAvatarUrlAttribute($value): ?string
    {
        if (!$value) return null;
        $parsed = parse_url($value);
        $path = $parsed['path'] ?? '';
        return request()->schemeAndHttpHost() . $path;
    }

    public function getAvatarThumbUrlAttribute(): ?string
    {
        $avatarUrl = $this->avatar_url;
        if (!$avatarUrl) return null;
        
        $info = pathinfo($avatarUrl);
        $thumbUrl = $info['dirname'] . '/' . $info['filename'] . '_thumb.' . ($info['extension'] ?? 'jpg');
        
        // Extract public storage relative path for checking existence
        $relativePath = str_replace(request()->schemeAndHttpHost() . '/storage/', '', $thumbUrl);
        
        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($relativePath)) {
            return $thumbUrl;
        }
        
        return $avatarUrl;
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'temp_password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_seen_at' => 'datetime',
            'privacy_settings' => 'array',
            'is_enabled' => 'boolean',
            'is_suspended' => 'boolean',
            'force_password_change' => 'boolean',
            'is_admin' => 'boolean',
        ];
    }

    public function conversations()
    {
        return $this->belongsToMany(Conversation::class, 'conversation_members')
                    ->withPivot('role', 'joined_at', 'last_read_message_id')
                    ->withTimestamps();
    }

    public function friendRequestsSent()
    {
        return $this->hasMany(FriendRequest::class, 'sender_id');
    }

    public function friendRequestsReceived()
    {
        return $this->hasMany(FriendRequest::class, 'receiver_id');
    }

    public function friendsList()
    {
        return $this->hasMany(Friend::class, 'user_id');
    }

    public function blockedUsers()
    {
        return $this->hasMany(BlockedUser::class, 'blocker_id');
    }

    public function devices()
    {
        return $this->hasMany(Device::class);
    }

    public function loginHistories()
    {
        return $this->hasMany(LoginHistory::class);
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function backups()
    {
        return $this->hasMany(Backup::class);
    }
}

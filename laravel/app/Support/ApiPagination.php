<?php

namespace App\Support;

use Illuminate\Http\Request;

class ApiPagination
{
    public static function perPage(Request $request, int $default = 20, int $max = 100): int
    {
        $v = (int) $request->input('per_page', $default);

        return min(max(1, $v), $max);
    }
}

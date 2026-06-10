<?php
    declare(strict_types=1);
    function api_get(string $url, ?string $method = null, array $data = []): string|false {
        $method = strtoupper($method ?? 'GET');
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $referer = "https://" . $_SERVER['SERVER_NAME'];
        $headers = "Accept: application/json\r\n" . ($userAgent ? "User-Agent: $userAgent\r\n" : "") . "Referer: $referer\r\n";
        $content = null;
        if (!empty($data)) {
            $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($data);
        }
        $options = [
            'http' => [
                'method'        => $method,
                'header'        => $headers,
                'ignore_errors' => true,
                'timeout'       => 5,
            ],
            "ssl" => [
                "verify_peer" => false,
                "verify_peer_name" => false,
                "allow_self_signed" => true
            ]
        ];
        if ($content !== null) {
            $options['http']['content'] = $content;
        }
        $context = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            error_log("[API REQUEST FAILED] $method $url");
            return false;
        }
        return $response;
    }
    $api_baseurl = $_SERVER['NULLSTATE_URL'];
    $url = $api_baseurl . "/api/visit?site_id=3";
    $response = api_get($url);
    if ($response === false) {
        http_response_code(502);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Nullstate failed'
        ]);
        exit;
    }
    header('Content-Type: application/json');
    echo $response;
?>
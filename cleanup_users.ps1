#!/usr/bin/env pwsh
# Non-interactive cleanup - auto-executes

$PROJECT_ID = "ecommerce-mern-main"
$BASE_URL = "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents"

function Get-FieldValue($fields, $fieldName) {
    if ($null -eq $fields) { return "" }
    $field = $fields.PSObject.Properties | Where-Object { $_.Name -eq $fieldName }
    if ($null -eq $field) { return "" }
    $val = $field.Value
    if ($null -eq $val) { return "" }
    $sv = $val.PSObject.Properties | Where-Object { $_.Name -eq "stringValue" }
    if ($null -ne $sv) { return $sv.Value }
    return ""
}

Write-Host "Fetching all user documents..." -ForegroundColor Yellow
$allUsers = @()
$nextPageToken = $null
do {
    $url = "$BASE_URL/users?pageSize=100"
    if ($nextPageToken) { $url += "&pageToken=$nextPageToken" }
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -ContentType "application/json"
        if ($response.documents) { $allUsers += $response.documents }
        $nextPageToken = $response.nextPageToken
    } catch { $nextPageToken = $null }
} while ($nextPageToken)

Write-Host "Found $($allUsers.Count) total docs" -ForegroundColor Green

$merged = 0; $deleted = 0; $errors = 0

foreach ($doc in $allUsers) {
    $docId = $doc.name.Split("/")[-1]
    $isBad = $false
    $correctId = ""
    
    if ($docId -match "^jwt_token_") {
        $isBad = $true
        $correctId = $docId -replace "^jwt_token_", ""
    }
    elseif ($docId -match "^usr_\d{13}") {
        $email = Get-FieldValue $doc.fields "email"
        if ($email) {
            $isBad = $true
            $cleanEmail = ($email.ToLower().Trim() -replace "[^a-zA-Z0-9]", "_")
            $correctId = "usr_$cleanEmail"
        }
    }
    
    if (-not $isBad) { continue }
    
    Write-Host "  $docId -> $correctId" -ForegroundColor Cyan -NoNewline
    
    # Merge fields to correct doc
    try {
        $fields = @{}
        foreach ($prop in $doc.fields.PSObject.Properties) {
            if ($prop.Name -ne "_id" -and $prop.Name -ne "id") {
                $fields[$prop.Name] = $prop.Value
            }
        }
        if ($fields.Count -gt 0) {
            $maskParams = ($fields.Keys | ForEach-Object { "updateMask.fieldPaths=$_" }) -join "&"
            $body = @{ fields = $fields } | ConvertTo-Json -Depth 20
            $patchUrl = "$BASE_URL/users/${correctId}?$maskParams"
            Invoke-RestMethod -Uri $patchUrl -Method Patch -Body $body -ContentType "application/json" | Out-Null
            $merged++
            Write-Host " [MERGED]" -ForegroundColor Green -NoNewline
        }
    } catch {
        Write-Host " [MERGE-SKIP]" -ForegroundColor Yellow -NoNewline
    }
    
    # Delete bad doc
    try {
        Invoke-RestMethod -Uri "$BASE_URL/users/$docId" -Method Delete | Out-Null
        $deleted++
        Write-Host " [DELETED]" -ForegroundColor Green
    } catch {
        $errors++
        Write-Host " [DELETE-FAILED]" -ForegroundColor Red
    }
}

Write-Host "`nDone! Merged: $merged | Deleted: $deleted | Errors: $errors" -ForegroundColor Green

Param(
  [ValidateSet('openrouter', 'github', 'groq')]
  & "$PSScriptRoot\run-aider.ps1" @args
  [string]$Model = "",

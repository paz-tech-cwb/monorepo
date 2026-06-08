package br.church.paz.shared.auth

data class TokenPair(val access: String, val refresh: String, val provider: String = "")

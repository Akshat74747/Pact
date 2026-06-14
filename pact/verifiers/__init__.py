from pact.verifiers.deterministic import DeterministicVerifier

def nli_verifier(*args, **kwargs):
    from pact.verifiers.nli import nli_verifier as _nli
    return _nli(*args, **kwargs)

def semantic_verifier(*args, **kwargs):
    from pact.verifiers.semantic import semantic_verifier as _sem
    return _sem(*args, **kwargs)

__all__ = ["nli_verifier", "DeterministicVerifier", "semantic_verifier"]

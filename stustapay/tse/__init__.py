"""
TSE Multiplexer: Manages all TSE (Technische Sicherheitseinrichtung) modules.

This multiplexer pulls signing requests from the database upon pg-notify notifications;
A signing request in the database is tagged with the associated PoS terminal.

Several Point-of-Sale terminals (PoS) can be registered with one
TSE in a N:1 relationship.

When the TSE multiplexer connects to a TSE, it requests the list of PoS Client IDs
that are connected to the TSE from the TSE.

Whenever we receive a new signing request from a specific PoS Client ID,

If the Client ID is registered with one of the TSEs:
  If that TSE is chronically overloaded:
    Deregister the Client ID from that TSE
    Register the Client ID with one TSE according to load balancing
Else:
  Register the Client ID with one TSE according to load balancing
Enqueue the signing request with the TSE Handler for which the Client ID is registered
Once the signing request has been completed, the signature is placed in the database.

The TSEHandler class is an abstract base class; handlers for various TSEs from various
manufacturers may be available, including simulated "Fake" TSEs which produce invalid
signatures.
"""

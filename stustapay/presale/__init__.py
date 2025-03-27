"""Implements presale
After confirmed ticket purchase by our sumup module
- create pdf ticket
- create pdf bon
- create transactions
- send mail to user

The module should run in an own process
- has a queue of jobs realized via the database
- takes out next job from the database
"""

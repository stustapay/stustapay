DSFinV-K for python
===================

This is a reusable python implementation of DSFinV-K, the export format every cash register in Germany has to
provide starting in 2020. **This library comes without any warranties, you are responsible to make sure that your
cash register outputs the correct data. Depending on your system, it might be required to export MORE data than this
library suggests.**

This is based on version 2.0 of the DSFinV-K spec, which can be downloaded here:
https://www.bzst.de/DE/Unternehmen/Aussenpruefungen/DigitaleSchnittstelleFinV/digitaleschnittstellefinv_node.html

Version scheme
--------------

The first two places indicate the spec version, i.e. ``2.0``, while the third place indicates the library version, i.e.
``2.0.4``.

Credits and License
-------------------

Maintainer: Raphael Michel <support@pretix.eu>

License of the Python code: Apache License 2.0

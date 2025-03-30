FROM pretix/standalone:stable

RUN mkdir /tmp/pretix-sumup-payment
COPY pretix-sumup-payment/ /tmp/pretix-sumup-payment
USER root
RUN cd /tmp/pretix-sumup-payment && python setup.py develop
USER pretixuser

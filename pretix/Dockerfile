FROM pretix/standalone:stable

RUN git clone https://github.com/wiomoc/pretix-sumup-payment.git /tmp/pretix-sumup-payment
USER root
RUN cd /tmp/pretix-sumup-payment && python setup.py develop
USER pretixuser

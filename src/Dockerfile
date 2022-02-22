FROM httpd:latest
RUN cd htdocs && mkdir css vendor fonts
COPY /css /usr/local/apache2/htdocs/css
COPY /fonts /usr/local/apache2/htdocs/fonts
COPY /vendor /usr/local/apache2/htdocs/vendor
COPY /index.html ./htdocs/
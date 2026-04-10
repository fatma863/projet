# Dockerfile for Laravel 12 API (PHP 8.2, Composer, MySQL client)
# Suitable for deployment on Render.com

FROM php:8.2-fpm

WORKDIR /var/www

RUN apt-get update \
    && apt-get install -y \
        git \
        curl \
        libpng-dev \
        libonig-dev \
        libxml2-dev \
        zip \
        unzip \
        libzip-dev \
        libpq-dev \
        libjpeg-dev \
        libfreetype6-dev \
        libmcrypt-dev \
        mariadb-client \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1

COPY --chown=www-data:www-data . /var/www

RUN mkdir -p bootstrap/cache \
    && mkdir -p database \
    && touch database/database.sqlite \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
    && chown -R www-data:www-data bootstrap storage database \
    && chmod -R ug+rwx bootstrap/cache storage database

RUN composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage

# Create startup script
RUN echo '#!/bin/sh\n\
php artisan config:cache\n\
php artisan route:cache\n\
php artisan migrate --force\n\
php artisan serve --host=0.0.0.0 --port=8000' > /usr/local/bin/start.sh \
    && chmod +x /usr/local/bin/start.sh

EXPOSE 8000
CMD ["/usr/local/bin/start.sh"]
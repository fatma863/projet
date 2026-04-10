# Dockerfile for Laravel 12 API (PHP 8.2, Composer, MySQL client)
# Suitable for deployment on Render.com

# Use official PHP image with extensions for Laravel
FROM php:8.2-fpm

# Set working directory
WORKDIR /var/www

# Install system dependencies
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

# Install Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Allow Composer to run as root inside container build
ENV COMPOSER_ALLOW_SUPERUSER=1

# Copy existing application directory contents
COPY --chown=www-data:www-data . /var/www

# Ensure Laravel runtime directories exist before Composer scripts run
RUN mkdir -p bootstrap/cache \
    && mkdir -p database \
    && touch database/database.sqlite \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
    && chown -R www-data:www-data bootstrap storage database \
    && chmod -R ug+rwx bootstrap/cache storage database

# Install PHP dependencies
RUN composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

# Set permissions for Laravel
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage

# Expose port 8000 and set the default command
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

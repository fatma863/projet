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

# Copy existing application directory contents
COPY . /var/www

# Copy existing application directory permissions
COPY --chown=www-data:www-data . /var/www

# Install PHP dependencies
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

# Set permissions for Laravel
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage

# Expose port 8000 and set the default command
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

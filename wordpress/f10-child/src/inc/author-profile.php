<?php

if (!defined('ABSPATH')) {
    exit;
}

const F10_AUTHOR_META_ROLE = 'f10_author_role';
const F10_AUTHOR_META_SHORT_BIO = 'f10_author_short_bio';
const F10_AUTHOR_META_SPECIALTIES = 'f10_author_specialties';
const F10_AUTHOR_META_LINKEDIN = 'f10_author_linkedin';
const F10_AUTHOR_META_AVATAR_ID = 'f10_author_avatar_id';
const F10_AUTHOR_META_IS_PUBLIC = 'f10_author_is_public';

/**
 * Registra os recursos de imagem usados nos perfis de autores.
 */
add_action('after_setup_theme', static function (): void {
    add_theme_support('post-thumbnails');
    add_image_size('f10-author-avatar', 640, 640, true);
});

/**
 * Retorna as iniciais do nome público do autor.
 */
function f10_get_author_initials(int $userId): string
{
    $displayName = trim((string) get_the_author_meta('display_name', $userId));

    if ($displayName === '') {
        return 'F10';
    }

    $nameParts = preg_split('/\s+/u', $displayName) ?: [];
    $initials = '';

    foreach (array_slice($nameParts, 0, 2) as $namePart) {
        $firstCharacter = function_exists('mb_substr')
            ? mb_substr($namePart, 0, 1)
            : substr($namePart, 0, 1);
        $initials .= function_exists('mb_strtoupper')
            ? mb_strtoupper($firstCharacter)
            : strtoupper($firstCharacter);
    }

    return $initials !== '' ? $initials : 'F10';
}

/**
 * Converte a lista de especialidades armazenada em texto para uma coleção limpa.
 *
 * @return string[]
 */
function f10_get_author_specialties(int $userId): array
{
    $rawSpecialties = (string) get_user_meta($userId, F10_AUTHOR_META_SPECIALTIES, true);

    if ($rawSpecialties === '') {
        return [];
    }

    $specialties = preg_split('/[,;\n]+/u', $rawSpecialties) ?: [];
    $specialties = array_map('trim', $specialties);
    $specialties = array_filter($specialties, static function (string $specialty): bool {
        return $specialty !== '';
    });

    return array_values(array_unique($specialties));
}

/**
 * Retorna os dados públicos centralizados do autor.
 *
 * @return array{
 *     user: WP_User,
 *     id: int,
 *     name: string,
 *     role: string,
 *     short_bio: string,
 *     description: string,
 *     specialties: string[],
 *     linkedin: string,
 *     avatar_id: int,
 *     archive_url: string,
 *     post_count: int
 * }
 */
function f10_get_author_profile_data(int $userId): array
{
    $user = get_userdata($userId);

    if (!$user instanceof WP_User) {
        $user = new WP_User();
    }

    $name = trim((string) $user->display_name);
    $description = trim((string) $user->description);
    $role = trim((string) get_user_meta($userId, F10_AUTHOR_META_ROLE, true));
    $shortBio = trim((string) get_user_meta($userId, F10_AUTHOR_META_SHORT_BIO, true));

    if ($role === '') {
        $role = 'Especialista da F10 Software';
    }

    if ($shortBio === '') {
        $shortBio = wp_trim_words(wp_strip_all_tags($description), 34, '…');
    }

    return [
        'user' => $user,
        'id' => $userId,
        'name' => $name !== '' ? $name : 'Autor F10',
        'role' => $role,
        'short_bio' => $shortBio,
        'description' => $description,
        'specialties' => f10_get_author_specialties($userId),
        'linkedin' => (string) get_user_meta($userId, F10_AUTHOR_META_LINKEDIN, true),
        'avatar_id' => absint(get_user_meta($userId, F10_AUTHOR_META_AVATAR_ID, true)),
        'archive_url' => get_author_posts_url($userId),
        'post_count' => (int) count_user_posts($userId, 'post', true),
    ];
}

/**
 * Define se o autor deve aparecer nas páginas públicas de equipe.
 */
function f10_is_author_public(int $userId): bool
{
    $metaValue = get_user_meta($userId, F10_AUTHOR_META_IS_PUBLIC, true);

    return $metaValue === '' || $metaValue === '1';
}

/**
 * Resolve o usuário associado a uma referência de avatar do WordPress.
 *
 * @param mixed $idOrEmail
 */
function f10_get_avatar_user_id($idOrEmail): int
{
    if ($idOrEmail instanceof WP_User) {
        return (int) $idOrEmail->ID;
    }

    if ($idOrEmail instanceof WP_Post) {
        return (int) $idOrEmail->post_author;
    }

    if ($idOrEmail instanceof WP_Comment) {
        if ((int) $idOrEmail->user_id > 0) {
            return (int) $idOrEmail->user_id;
        }

        $idOrEmail = (string) $idOrEmail->comment_author_email;
    }

    if (is_numeric($idOrEmail)) {
        return absint($idOrEmail);
    }

    if (is_object($idOrEmail) && isset($idOrEmail->user_id)) {
        return absint($idOrEmail->user_id);
    }

    if (is_string($idOrEmail) && is_email($idOrEmail)) {
        $user = get_user_by('email', $idOrEmail);

        return $user instanceof WP_User ? (int) $user->ID : 0;
    }

    return 0;
}

/**
 * Substitui o Gravatar pela foto local cadastrada no perfil do autor.
 *
 * @param array<string, mixed> $args
 * @param mixed                $idOrEmail
 * @return array<string, mixed>
 */
function f10_filter_avatar_data(array $args, $idOrEmail): array
{
    $userId = f10_get_avatar_user_id($idOrEmail);

    if ($userId < 1) {
        return $args;
    }

    $avatarId = absint(get_user_meta($userId, F10_AUTHOR_META_AVATAR_ID, true));

    if ($avatarId < 1 || !wp_attachment_is_image($avatarId)) {
        return $args;
    }

    $requestedSize = isset($args['size']) ? max(32, absint($args['size'])) : 96;
    $image = wp_get_attachment_image_src($avatarId, [$requestedSize, $requestedSize]);

    if (!is_array($image) || empty($image[0])) {
        return $args;
    }

    $args['url'] = esc_url_raw((string) $image[0]);
    $args['found_avatar'] = true;

    return $args;
}
add_filter('get_avatar_data', 'f10_filter_avatar_data', 10, 2);

/**
 * Retorna autores com posts publicados e perfil público habilitado.
 *
 * @return WP_User[]
 */
function f10_get_public_authors(): array
{
    $users = get_users([
        'orderby' => 'display_name',
        'order' => 'ASC',
        'has_published_posts' => ['post'],
    ]);

    return array_values(array_filter(
        $users,
        static function (WP_User $user): bool {
            return f10_is_author_public((int) $user->ID);
        }
    ));
}

/**
 * Renderiza a foto local do autor ou um fallback com iniciais.
 *
 * @param array<string, string> $attributes
 */
function f10_get_author_avatar_html(int $userId, int $size = 320, array $attributes = []): string
{
    $profile = f10_get_author_profile_data($userId);
    $avatarId = $profile['avatar_id'];
    $baseClass = trim('f10-author-avatar ' . ($attributes['class'] ?? ''));
    $loading = $attributes['loading'] ?? 'lazy';
    $decoding = $attributes['decoding'] ?? 'async';

    if ($avatarId > 0 && wp_attachment_is_image($avatarId)) {
        $imageAttributes = array_merge($attributes, [
            'class' => $baseClass,
            'alt' => sprintf('%s, %s', $profile['name'], $profile['role']),
            'loading' => $loading,
            'decoding' => $decoding,
            'sizes' => sprintf('%dpx', $size),
        ]);

        return (string) wp_get_attachment_image(
            $avatarId,
            'f10-author-avatar',
            false,
            $imageAttributes
        );
    }

    return sprintf(
        '<span class="%1$s f10-author-avatar--fallback" role="img" aria-label="%2$s">%3$s</span>',
        esc_attr($baseClass),
        esc_attr(sprintf('Foto de %s indisponível', $profile['name'])),
        esc_html(f10_get_author_initials($userId))
    );
}

/**
 * Normaliza e valida o endereço público do LinkedIn.
 */
function f10_sanitize_linkedin_url(string $url): string
{
    $sanitizedUrl = esc_url_raw(trim($url), ['https']);

    if ($sanitizedUrl === '') {
        return '';
    }

    $host = strtolower((string) wp_parse_url($sanitizedUrl, PHP_URL_HOST));

    $isLinkedInHost = $host === 'linkedin.com'
        || preg_match('/\.linkedin\.com$/', $host) === 1;

    if (!$isLinkedInHost) {
        return '';
    }

    return $sanitizedUrl;
}

/**
 * Exibe os campos editoriais do autor no perfil de usuário.
 */
function f10_render_author_profile_fields(WP_User $user): void
{
    $profile = f10_get_author_profile_data((int) $user->ID);
    $isPublic = f10_is_author_public((int) $user->ID);
    ?>
    <h2>Perfil público do autor F10</h2>

    <?php wp_nonce_field('f10_save_author_profile', 'f10_author_profile_nonce'); ?>

    <table class="form-table" role="presentation">
        <tr>
            <th><label for="f10-author-role">Cargo e especialidade principal</label></th>
            <td>
                <input
                    type="text"
                    id="f10-author-role"
                    name="f10_author_role"
                    value="<?php echo esc_attr($profile['role']); ?>"
                    class="regular-text"
                    maxlength="140"
                >
                <p class="description">Exemplo: Head Comercial e especialista em vendas e matrículas.</p>
            </td>
        </tr>

        <tr>
            <th><label for="f10-author-short-bio">Biografia curta</label></th>
            <td>
                <textarea
                    id="f10-author-short-bio"
                    name="f10_author_short_bio"
                    rows="4"
                    class="large-text"
                    maxlength="420"
                ><?php echo esc_textarea($profile['short_bio']); ?></textarea>
                <p class="description">Texto usado nos cards e na caixa de autor ao final dos posts.</p>
            </td>
        </tr>

        <tr>
            <th><label for="f10-author-specialties">Especialidades</label></th>
            <td>
                <input
                    type="text"
                    id="f10-author-specialties"
                    name="f10_author_specialties"
                    value="<?php echo esc_attr(implode(', ', $profile['specialties'])); ?>"
                    class="large-text"
                    maxlength="300"
                >
                <p class="description">Separe por vírgulas. Exemplo: Vendas, Captação de alunos, Funil de matrículas.</p>
            </td>
        </tr>

        <tr>
            <th><label for="f10-author-linkedin">LinkedIn</label></th>
            <td>
                <input
                    type="url"
                    id="f10-author-linkedin"
                    name="f10_author_linkedin"
                    value="<?php echo esc_attr($profile['linkedin']); ?>"
                    class="regular-text code"
                    placeholder="https://www.linkedin.com/in/..."
                >
            </td>
        </tr>

        <tr>
            <th>Foto local do autor</th>
            <td>
                <div
                    class="f10-author-admin-avatar"
                    data-f10-author-avatar
                    data-f10-author-initials="<?php echo esc_attr(f10_get_author_initials((int) $user->ID)); ?>"
                >
                    <div class="f10-author-admin-avatar__preview" data-f10-author-avatar-preview>
                        <?php echo f10_get_author_avatar_html((int) $user->ID, 320, ['loading' => 'eager']); ?>
                    </div>

                    <input
                        type="hidden"
                        name="f10_author_avatar_id"
                        value="<?php echo esc_attr((string) $profile['avatar_id']); ?>"
                        data-f10-author-avatar-input
                    >

                    <div class="f10-author-admin-avatar__actions">
                        <button type="button" class="button button-secondary" data-f10-author-avatar-select>
                            Selecionar foto
                        </button>
                        <button type="button" class="button button-link-delete" data-f10-author-avatar-remove>
                            Remover foto
                        </button>
                    </div>
                </div>
                <p class="description">Use uma imagem quadrada com pelo menos 800 × 800 px. O arquivo fica na Biblioteca de Mídia, sem depender do Gravatar.</p>
            </td>
        </tr>

        <tr>
            <th>Visibilidade</th>
            <td>
                <label>
                    <input
                        type="checkbox"
                        name="f10_author_is_public"
                        value="1"
                        <?php checked($isPublic); ?>
                    >
                    Exibir este usuário na lista pública de autores
                </label>
            </td>
        </tr>
    </table>
    <?php
}
add_action('show_user_profile', 'f10_render_author_profile_fields');
add_action('edit_user_profile', 'f10_render_author_profile_fields');

/**
 * Persiste os campos editoriais do autor com validação de permissão e nonce.
 */
function f10_save_author_profile_fields(int $userId): void
{
    $nonce = isset($_POST['f10_author_profile_nonce'])
        ? sanitize_text_field(wp_unslash($_POST['f10_author_profile_nonce']))
        : '';

    if (!wp_verify_nonce($nonce, 'f10_save_author_profile')) {
        return;
    }

    if (!current_user_can('edit_user', $userId)) {
        return;
    }

    $role = isset($_POST['f10_author_role'])
        ? sanitize_text_field(wp_unslash($_POST['f10_author_role']))
        : '';
    $shortBio = isset($_POST['f10_author_short_bio'])
        ? sanitize_textarea_field(wp_unslash($_POST['f10_author_short_bio']))
        : '';
    $specialties = isset($_POST['f10_author_specialties'])
        ? sanitize_text_field(wp_unslash($_POST['f10_author_specialties']))
        : '';
    $linkedin = isset($_POST['f10_author_linkedin'])
        ? f10_sanitize_linkedin_url((string) wp_unslash($_POST['f10_author_linkedin']))
        : '';
    $avatarId = isset($_POST['f10_author_avatar_id'])
        ? absint($_POST['f10_author_avatar_id'])
        : 0;
    $isPublic = isset($_POST['f10_author_is_public']) ? '1' : '0';

    if ($avatarId > 0 && !wp_attachment_is_image($avatarId)) {
        $avatarId = 0;
    }

    update_user_meta($userId, F10_AUTHOR_META_ROLE, $role);
    update_user_meta($userId, F10_AUTHOR_META_SHORT_BIO, $shortBio);
    update_user_meta($userId, F10_AUTHOR_META_SPECIALTIES, $specialties);
    update_user_meta($userId, F10_AUTHOR_META_LINKEDIN, $linkedin);
    update_user_meta($userId, F10_AUTHOR_META_AVATAR_ID, $avatarId);
    update_user_meta($userId, F10_AUTHOR_META_IS_PUBLIC, $isPublic);
}
add_action('personal_options_update', 'f10_save_author_profile_fields');
add_action('edit_user_profile_update', 'f10_save_author_profile_fields');

/**
 * Carrega os recursos do seletor de foto somente nas telas de perfil.
 */
function f10_enqueue_author_profile_admin_assets(string $hookSuffix): void
{
    if (!in_array($hookSuffix, ['profile.php', 'user-edit.php'], true)) {
        return;
    }

    wp_enqueue_media();

    $scriptRelativePath = '/assets/js/f10-author-profile-admin.js';
    $scriptAbsolutePath = get_stylesheet_directory() . $scriptRelativePath;
    $styleRelativePath = '/assets/css/f10-author-admin.css';
    $styleAbsolutePath = get_stylesheet_directory() . $styleRelativePath;

    wp_enqueue_script(
        'f10-author-profile-admin',
        get_stylesheet_directory_uri() . $scriptRelativePath,
        ['jquery'],
        file_exists($scriptAbsolutePath) ? (string) filemtime($scriptAbsolutePath) : '1.0.0',
        true
    );

    wp_enqueue_style(
        'f10-author-admin',
        get_stylesheet_directory_uri() . $styleRelativePath,
        [],
        file_exists($styleAbsolutePath) ? (string) filemtime($styleAbsolutePath) : '1.0.0'
    );
}
add_action('admin_enqueue_scripts', 'f10_enqueue_author_profile_admin_assets');

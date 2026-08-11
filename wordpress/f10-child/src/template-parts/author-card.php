<?php

if (!defined('ABSPATH')) {
    exit;
}

$authorId = isset($args['author_id']) ? absint($args['author_id']) : 0;

if ($authorId < 1 || !f10_is_author_public($authorId)) {
    return;
}

$profile = f10_get_author_profile_data($authorId);
?>
<article class="f10-author-card">
    <a href="<?php echo esc_url($profile['archive_url']); ?>" class="f10-author-card__main" rel="author">
        <div class="f10-author-card__photo">
            <?php echo f10_get_author_avatar_html($authorId, 320); ?>
        </div>

        <div class="f10-author-card__content">
            <span class="f10-author-card__label">Especialista F10</span>
            <h2><?php echo esc_html($profile['name']); ?></h2>
            <p class="f10-author-card__role"><?php echo esc_html($profile['role']); ?></p>

            <?php if ($profile['short_bio'] !== '') : ?>
                <p class="f10-author-card__bio"><?php echo esc_html($profile['short_bio']); ?></p>
            <?php endif; ?>

            <?php if (!empty($profile['specialties'])) : ?>
                <ul class="f10-author-specialties" aria-label="Especialidades de <?php echo esc_attr($profile['name']); ?>">
                    <?php foreach (array_slice($profile['specialties'], 0, 4) as $specialty) : ?>
                        <li><?php echo esc_html($specialty); ?></li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>

            <div class="f10-author-card__footer">
                <span>
                    <?php echo esc_html((string) $profile['post_count']); ?>
                    <?php echo $profile['post_count'] === 1 ? 'artigo publicado' : 'artigos publicados'; ?>
                </span>
                <strong>Ver perfil</strong>
            </div>
        </div>
    </a>
</article>

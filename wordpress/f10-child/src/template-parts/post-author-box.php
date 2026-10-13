<?php

if (!defined('ABSPATH')) {
    exit;
}

$authorId = isset($args['author_id']) ? absint($args['author_id']) : 0;

if ($authorId < 1) {
    return;
}

$profile = f10_get_author_profile_data($authorId);
?>
<aside class="f10-post-author" aria-labelledby="f10-post-author-name">
    <div class="f10-post-author__photo">
        <?php echo f10_get_author_avatar_html($authorId, 320); ?>
    </div>

    <div class="f10-post-author__content">
        <span class="f10-post-author__eyebrow">Sobre o autor</span>

        <h2 id="f10-post-author-name">
            <a href="<?php echo esc_url($profile['archive_url']); ?>" rel="author">
                <?php echo esc_html($profile['name']); ?>
            </a>
        </h2>

        <p class="f10-post-author__role"><?php echo esc_html($profile['role']); ?></p>

        <?php if ($profile['short_bio'] !== '') : ?>
            <p class="f10-post-author__bio"><?php echo esc_html($profile['short_bio']); ?></p>
        <?php endif; ?>

        <?php if (!empty($profile['specialties'])) : ?>
            <ul class="f10-author-specialties" aria-label="Especialidades do autor">
                <?php foreach ($profile['specialties'] as $specialty) : ?>
                    <li><?php echo esc_html($specialty); ?></li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>

        <div class="f10-post-author__actions">
            <a href="<?php echo esc_url($profile['archive_url']); ?>" class="f10-author-button f10-author-button--primary" rel="author">
                Ver artigos de <?php echo esc_html($profile['name']); ?>
            </a>

            <?php if ($profile['linkedin'] !== '') : ?>
                <a
                    href="<?php echo esc_url($profile['linkedin']); ?>"
                    class="f10-author-button f10-author-button--secondary"
                    target="_blank"
                    rel="noopener noreferrer me"
                >
                    LinkedIn
                </a>
            <?php endif; ?>
        </div>
    </div>
</aside>

<?php
/**
 * Arquivo público de um autor do blog F10.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

$author = get_queried_object();

if (!$author instanceof WP_User) {
    get_footer();
    return;
}

$authorId = (int) $author->ID;
$profile = f10_get_author_profile_data($authorId);
?>
<main class="f10-author-page">
    <section class="f10-author-hero">
        <div class="f10-author-shell">
            <div class="f10-author-hero__grid">
                <div class="f10-author-hero__photo">
                    <?php echo f10_get_author_avatar_html($authorId, 640, ['loading' => 'eager']); ?>
                </div>

                <div class="f10-author-hero__content">
                    <span class="f10-author-kicker">Autor F10 Software</span>
                    <h1><?php echo esc_html($profile['name']); ?></h1>
                    <p class="f10-author-hero__role"><?php echo esc_html($profile['role']); ?></p>

                    <?php if ($profile['description'] !== '') : ?>
                        <div class="f10-author-hero__bio">
                            <?php echo wp_kses_post(wpautop($profile['description'])); ?>
                        </div>
                    <?php elseif ($profile['short_bio'] !== '') : ?>
                        <p class="f10-author-hero__bio"><?php echo esc_html($profile['short_bio']); ?></p>
                    <?php endif; ?>

                    <?php if (!empty($profile['specialties'])) : ?>
                        <ul class="f10-author-specialties" aria-label="Especialidades de <?php echo esc_attr($profile['name']); ?>">
                            <?php foreach ($profile['specialties'] as $specialty) : ?>
                                <li><?php echo esc_html($specialty); ?></li>
                            <?php endforeach; ?>
                        </ul>
                    <?php endif; ?>

                    <div class="f10-author-hero__actions">
                        <?php if ($profile['linkedin'] !== '') : ?>
                            <a
                                href="<?php echo esc_url($profile['linkedin']); ?>"
                                class="f10-author-button f10-author-button--primary"
                                target="_blank"
                                rel="noopener noreferrer me"
                            >
                                Ver LinkedIn
                            </a>
                        <?php endif; ?>

                        <a href="#artigos" class="f10-author-button f10-author-button--secondary">
                            Ver artigos publicados
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="f10-author-posts" id="artigos">
        <div class="f10-author-shell">
            <header class="f10-author-section-heading">
                <span>Conteúdo especializado</span>
                <h2>Artigos de <?php echo esc_html($profile['name']); ?></h2>
                <p>
                    <?php echo esc_html((string) $profile['post_count']); ?>
                    <?php echo $profile['post_count'] === 1 ? 'conteúdo publicado' : 'conteúdos publicados'; ?>
                </p>
            </header>

            <?php if (have_posts()) : ?>
                <div class="f10-author-post-grid">
                    <?php while (have_posts()) : ?>
                        <?php
                        the_post();
                        $postId = get_the_ID();
                        $thumbnailId = get_post_thumbnail_id($postId);
                        $category = get_the_category($postId);
                        ?>
                        <article class="f10-author-post-card">
                            <a href="<?php the_permalink(); ?>" class="f10-author-post-card__link">
                                <div class="f10-author-post-card__media<?php echo $thumbnailId < 1 ? ' f10-author-post-card__media--placeholder' : ''; ?>">
                                    <?php if ($thumbnailId > 0) : ?>
                                        <?php
                                        echo wp_get_attachment_image(
                                            $thumbnailId,
                                            'medium_large',
                                            false,
                                            [
                                                'alt' => get_the_title($postId),
                                                'loading' => 'lazy',
                                                'decoding' => 'async',
                                                'sizes' => '(max-width: 720px) calc(100vw - 32px), (max-width: 1100px) 50vw, 380px',
                                            ]
                                        );
                                        ?>
                                    <?php else : ?>
                                        <span>F10</span>
                                    <?php endif; ?>
                                </div>

                                <div class="f10-author-post-card__body">
                                    <?php if (!empty($category)) : ?>
                                        <span class="f10-author-post-card__category"><?php echo esc_html($category[0]->name); ?></span>
                                    <?php endif; ?>

                                    <h3><?php the_title(); ?></h3>
                                    <p><?php echo esc_html(wp_trim_words(get_the_excerpt(), 24, '…')); ?></p>

                                    <div class="f10-author-post-card__meta">
                                        <time datetime="<?php echo esc_attr(get_the_date(DATE_W3C)); ?>">
                                            <?php echo esc_html(get_the_date('d/m/Y')); ?>
                                        </time>
                                        <strong>Ler artigo</strong>
                                    </div>
                                </div>
                            </a>
                        </article>
                    <?php endwhile; ?>
                </div>

                <?php
                the_posts_pagination([
                    'mid_size' => 1,
                    'prev_text' => '← Anterior',
                    'next_text' => 'Próxima →',
                    'screen_reader_text' => 'Navegação entre páginas de artigos',
                ]);
                ?>
            <?php else : ?>
                <div class="f10-author-empty">
                    <h2>Nenhum artigo publicado</h2>
                    <p>Este autor ainda não possui conteúdos disponíveis.</p>
                </div>
            <?php endif; ?>
        </div>
    </section>
</main>
<?php
get_footer();

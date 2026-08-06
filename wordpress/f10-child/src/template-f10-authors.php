<?php
/**
 * Template Name: F10 - Autores
 * Description: Lista pública de especialistas e autores do blog F10.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

$authors = f10_get_public_authors();
?>
<main class="f10-authors-page">
    <section class="f10-authors-hero">
        <div class="f10-author-shell">
            <div class="f10-authors-hero__content">
                <span class="f10-author-kicker">Especialistas F10</span>
                <h1>Conheça os autores do Blog F10</h1>
                <p>
                    Conteúdos produzidos por profissionais que acompanham vendas, matrículas,
                    tecnologia, gestão financeira e operação de instituições de ensino.
                </p>
            </div>
        </div>
    </section>

    <section class="f10-authors-list-section">
        <div class="f10-author-shell">
            <?php if (!empty($authors)) : ?>
                <div class="f10-authors-grid">
                    <?php foreach ($authors as $author) : ?>
                        <?php
                        get_template_part(
                            'template-parts/author-card',
                            null,
                            ['author_id' => (int) $author->ID]
                        );
                        ?>
                    <?php endforeach; ?>
                </div>
            <?php else : ?>
                <div class="f10-author-empty">
                    <h2>Nenhum autor público encontrado</h2>
                    <p>Cadastre os perfis dos autores em Usuários e publique ao menos um artigo.</p>
                </div>
            <?php endif; ?>
        </div>
    </section>
</main>
<?php
get_footer();

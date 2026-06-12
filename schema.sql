-- ============================================================
-- RECIPE APP - Schema + Seed Data
-- Supabase PostgreSQL
-- ============================================================

-- ============================================================
-- 1. TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS recipes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    title       text NOT NULL,
    description text,
    steps       jsonb DEFAULT '[]'::jsonb,
    prep_time   integer,
    cook_time   integer,
    total_time  integer,
    difficulty  integer CHECK (difficulty BETWEEN 1 AND 5),
    portions    integer,
    image_url   text,
    tags        text[],
    category    text,
    user_id     uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name        text NOT NULL,
    quantity    numeric,
    unit        text,
    optional    boolean DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pantry_items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id),
    name        text NOT NULL,
    quantity    numeric,
    unit        text,
    category    text,
    expiry_date date,
    notes       text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_plans (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id),
    recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    date        date NOT NULL,
    meal_type   text CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ratings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id),
    recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    rating      integer CHECK (rating BETWEEN 1 AND 5),
    cooked_at   date,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients (recipe_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id      ON pantry_items (user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id_date  ON meal_plans (user_id, date);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id_recipe_id ON ratings (user_id, recipe_id);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE recipes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings            ENABLE ROW LEVEL SECURITY;

-- Drop old policies (idempotent)
DROP POLICY IF EXISTS "recipes_select" ON recipes;
DROP POLICY IF EXISTS "recipes_insert" ON recipes;
DROP POLICY IF EXISTS "recipes_update" ON recipes;
DROP POLICY IF EXISTS "recipes_delete" ON recipes;
DROP POLICY IF EXISTS "ingredients_select" ON recipe_ingredients;
DROP POLICY IF EXISTS "ingredients_insert" ON recipe_ingredients;
DROP POLICY IF EXISTS "ingredients_update" ON recipe_ingredients;
DROP POLICY IF EXISTS "ingredients_delete" ON recipe_ingredients;
DROP POLICY IF EXISTS "pantry_select" ON pantry_items;
DROP POLICY IF EXISTS "pantry_insert" ON pantry_items;
DROP POLICY IF EXISTS "pantry_update" ON pantry_items;
DROP POLICY IF EXISTS "pantry_delete" ON pantry_items;
DROP POLICY IF EXISTS "meal_plans_select" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_insert" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_update" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_delete" ON meal_plans;
DROP POLICY IF EXISTS "ratings_select" ON ratings;
DROP POLICY IF EXISTS "ratings_insert" ON ratings;
DROP POLICY IF EXISTS "ratings_update" ON ratings;
DROP POLICY IF EXISTS "ratings_delete" ON ratings;

-- Recipes: public read, owner write
CREATE POLICY "recipes_select" ON recipes FOR SELECT USING (true);
CREATE POLICY "recipes_insert" ON recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipes_update" ON recipes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipes_delete" ON recipes FOR DELETE USING (auth.uid() = user_id);

-- Recipe ingredients: public read, recipe owner writes
CREATE POLICY "ingredients_select" ON recipe_ingredients FOR SELECT USING (true);
CREATE POLICY "ingredients_insert" ON recipe_ingredients FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
);
CREATE POLICY "ingredients_update" ON recipe_ingredients FOR UPDATE USING (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
);
CREATE POLICY "ingredients_delete" ON recipe_ingredients FOR DELETE USING (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
);

-- Pantry items: public read, owner write (for now, public read so pantry count works without auth)
CREATE POLICY "pantry_select" ON pantry_items FOR SELECT USING (true);
CREATE POLICY "pantry_insert" ON pantry_items FOR INSERT WITH CHECK (true);
CREATE POLICY "pantry_update" ON pantry_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pantry_delete" ON pantry_items FOR DELETE USING (auth.uid() = user_id);

-- Meal plans: owner only
CREATE POLICY "meal_plans_select" ON meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meal_plans_insert" ON meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meal_plans_update" ON meal_plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meal_plans_delete" ON meal_plans FOR DELETE USING (auth.uid() = user_id);

-- Ratings: owner only
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings_update" ON ratings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings_delete" ON ratings FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. SEED DATA
-- User placeholder: 00000000-0000-0000-0000-000000000000
-- ============================================================

DO $$
DECLARE
    r_bolo_choc       uuid;
    r_mousse_choc     uuid;
    r_pasteis_nata    uuid;
    r_bacalhau_bras   uuid;
    r_arroz_pato      uuid;
    r_francesinha     uuid;
    r_acorda          uuid;
    r_caldo_verde     uuid;
    r_arroz_marisco   uuid;
    r_bifana          uuid;
    r_pizza_marg      uuid;
    r_carbonara       uuid;
    r_risotto         uuid;
    r_salmao          uuid;
    r_frango_assado   uuid;
    r_lasanha         uuid;
    r_tacos           uuid;
    r_pad_thai        uuid;
    r_sushi_bowl      uuid;
    r_salada_caesar   uuid;
    r_hamburguer      uuid;
    r_sopa_legumes    uuid;
    r_omelete         uuid;
    r_panquecas       uuid;
    r_waffles         uuid;
    r_tosta_mista     uuid;
    r_sanduiche_nat   uuid;
    r_bolonhesa       uuid;
    r_feijoada        uuid;
    r_cataplana       uuid;
    r_user            uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN

-- ============================================================
-- Bolo de Chocolate
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Bolo de Chocolate',
    'Bolo de chocolate fofinho e húmido, perfeito para sobremesa da família.',
    '["Pré-aqueça o forno a 180°C. Unte uma forma redonda.","Numa tigela misture farinha, cacau, açúcar, fermento e bicarbonato.","Bata ovos com leite, óleo e baunilha. Junte aos secos.","Misture bem até obter massa lisa. Despeje na forma.","Leve ao forno 30-35 min. Deixe arrefecer.","Cubra com ganache de chocolate."]'::jsonb,
    15, 35, 50, 2, 8,
    ARRAY['sobremesas','bolos','chocolate'],
    'Sobremesas', r_user
) RETURNING id INTO r_bolo_choc;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_bolo_choc, 'Farinha de trigo', 2, 'chávenas', false),
    (r_bolo_choc, 'Cacau em pó', 1, 'chávena', false),
    (r_bolo_choc, 'Açúcar', 2, 'chávenas', false),
    (r_bolo_choc, 'Ovos', 2, 'unidades', false),
    (r_bolo_choc, 'Leite', 1, 'chávena', false),
    (r_bolo_choc, 'Óleo vegetal', 0.5, 'chávena', false),
    (r_bolo_choc, 'Fermento em pó', 1, 'colher de chá', false),
    (r_bolo_choc, 'Extrato de baunilha', 2, 'colheres de chá', true);

-- ============================================================
-- Mousse de Chocolate
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Mousse de Chocolate',
    'Mousse de chocolate leve e aerada, uma sobremesa clássica elegante.',
    '["Derreta 200 g chocolate negro em banho-maria.","Bata 3 gemas com 3 colheres de sopa de açúcar até creme claro.","Junte o chocolate derretido às gemas e envolva.","Bata 3 claras em castelo com pitada de sal.","Envolva claras no chocolate delicadamente.","Divida em taças, leve ao frigo 2h."]'::jsonb,
    20, 5, 25, 2, 4,
    ARRAY['sobremesas','chocolate','francesa'],
    'Sobremesas', r_user
) RETURNING id INTO r_mousse_choc;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_mousse_choc, 'Chocolate negro', 200, 'g', false),
    (r_mousse_choc, 'Ovos', 3, 'unidades', false),
    (r_mousse_choc, 'Açúcar', 3, 'colheres de sopa', false),
    (r_mousse_choc, 'Sal', 1, 'pitada', false),
    (r_mousse_choc, 'Natas', 100, 'ml', true);

-- ============================================================
-- Pastéis de Nata
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Pastéis de Nata',
    'O icónico pastel de nata com estaladiço folhado e creme de ovos caramelizado.',
    '["Faça calda com açúcar, água, limão e canela.","Misture leite com farinha dissolvida. Verta calda quente.","Adicione 8 gemas batidas, mexa em fogo baixo.","Acrescente baunilha. Deixe arrefecer.","Forre forminhas com massa folhada. Distribua o creme.","Leve a 250°C por 10-12 min até dourar."]'::jsonb,
    30, 15, 120, 4, 12,
    ARRAY['portuguesas','sobremesas','pastéis','doces'],
    'Sobremesas', r_user
) RETURNING id INTO r_pasteis_nata;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_pasteis_nata, 'Massa folhada', 500, 'g', false),
    (r_pasteis_nata, 'Açúcar', 2, 'chávenas', false),
    (r_pasteis_nata, 'Água', 1, 'chávena', false),
    (r_pasteis_nata, 'Leite', 500, 'ml', false),
    (r_pasteis_nata, 'Farinha de trigo', 4, 'colheres de sopa', false),
    (r_pasteis_nata, 'Gemas de ovo', 8, 'unidades', false),
    (r_pasteis_nata, 'Casca de limão', 1, 'unidade', false),
    (r_pasteis_nata, 'Pau de canela', 1, 'unidade', false),
    (r_pasteis_nata, 'Extrato de baunilla', 1, 'colher de chá', true);

-- ============================================================
-- Bacalhau à Brás
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Bacalhau à Brás',
    'Clássico lisboeta: bacalhau desfiado com batata palha, ovos e cebola.',
    '["Demolhe o bacalhau. Escorra e desfie.","Corte a batata palha em pedaços pequenos.","Refogue a cebola no azeite. Junte bacalhau.","Adicione batata palha. Misture.","Bata 6 ovos temperados. Verta e mexa até cremoso.","Sirva com salsa e azeitonas."]'::jsonb,
    20, 20, 40, 2, 4,
    ARRAY['portuguesas','bacalhau','peixe','tradicional'],
    'Pratos Principais', r_user
) RETURNING id INTO r_bacalhau_bras;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_bacalhau_bras, 'Bacalhau dessalgado', 400, 'g', false),
    (r_bacalhau_bras, 'Batata palha', 200, 'g', false),
    (r_bacalhau_bras, 'Cebola', 2, 'unidades', false),
    (r_bacalhau_bras, 'Ovos', 6, 'unidades', false),
    (r_bacalhau_bras, 'Azeite', 100, 'ml', false),
    (r_bacalhau_bras, 'Salsa fresca', 3, 'colheres de sopa', true),
    (r_bacalhau_bras, 'Azeitonas pretas', 50, 'g', true);

-- ============================================================
-- Arroz de Pato
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Arroz de Pato',
    'Arroz de pato no forno com chouriço e laranja, clássico português.',
    '["Coza o pato em água com temperos por 1h. Desfie.","Refogue cebola no azeite. Adicione chouriço em fatias.","Junte arroz e envolva. Adicione caldo quente.","Mexa, tampe, leve ao forno 180°C por 20 min.","Desfie pato por cima, mais chouriço. Mais 10 min no forno.","Sirva com laranja."]'::jsonb,
    30, 90, 120, 4, 6,
    ARRAY['portuguesas','arroz','pato','forno'],
    'Pratos Principais', r_user
) RETURNING id INTO r_arroz_pato;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_arroz_pato, 'Pato inteiro', 1, 'unidade', false),
    (r_arroz_pato, 'Arroz agulha', 300, 'g', false),
    (r_arroz_pato, 'Chouriço', 200, 'g', false),
    (r_arroz_pato, 'Cebola', 1, 'unidade', false),
    (r_arroz_pato, 'Azeite', 3, 'colheres de sopa', false),
    (r_arroz_pato, 'Louro', 2, 'folhas', false),
    (r_arroz_pato, 'Laranja', 1, 'unidade', true);

-- ============================================================
-- Francesinha
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Francesinha',
    'Sanduíche portuense coberta com queijo, ovo e molho picante.',
    '["Refogue cebola, alho. Junte tomate, cerveja, louro, whisk. Apure 30 min.","Toste pão de forma. Grelhe bifanas, chouriça, linguiça, fiambre.","Monte: pão + carne + pão. Cubra com molho e queijo.","Gratine no forno.","Sirva com ovo estrelado por cima e batatas fritas."]'::jsonb,
    30, 60, 90, 4, 2,
    ARRAY['portuguesas','sandes','Porto','tradicional'],
    'Pratos Principais', r_user
) RETURNING id INTO r_francesinha;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_francesinha, 'Pão de forma', 4, 'fatias', false),
    (r_francesinha, 'Bifanas (carne de porco)', 200, 'g', false),
    (r_francesinha, 'Fiambre', 4, 'fatias', false),
    (r_francesinha, 'Chouriço', 4, 'fatias', false),
    (r_francesinha, 'Linguiça', 4, 'fatias', false),
    (r_francesinha, 'Queijo mozzarella', 100, 'g', false),
    (r_francesinha, 'Cerveja preta', 250, 'ml', false),
    (r_francesinha, 'Polpa de tomate', 200, 'g', false),
    (r_francesinha, 'Cebola', 1, 'unidade', false),
    (r_francesinha, 'Alho', 2, 'dentes', false),
    (r_francesinha, 'Ovos', 2, 'unidades', false),
    (r_francesinha, 'Whisky', 1, 'colher de sopa', true),
    (r_francesinha, 'Batatas fritas', 300, 'g', true);

-- ============================================================
-- Açorda Alentejana
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Açorda Alentejana',
    'Sopa tradicional alentejana com pão, coentros, alho e ovo escalfado.',
    '["Leve água com sal, alho, louro, azeite, vinagre ao lume.","Escalfe ovos no caldo fervente.","Numa tigela: fatias de pão duro e coentros picados.","Verta caldo quente sobre o pão. Coloque ovo por cima.","Sirva com coentros frescos."]'::jsonb,
    10, 10, 20, 2, 4,
    ARRAY['portuguesas','Alentejo','sopas','pão'],
    'Sopas', r_user
) RETURNING id INTO r_acorda;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_acorda, 'Pão alentejano duro', 400, 'g', false),
    (r_acorda, 'Ovos', 4, 'unidades', false),
    (r_acorda, 'Coentros frescos', 1, 'molho', false),
    (r_acorda, 'Alho', 4, 'dentes', false),
    (r_acorda, 'Azeite', 4, 'colheres de sopa', false),
    (r_acorda, 'Louro', 1, 'folha', false),
    (r_acorda, 'Vinagre', 1, 'colher de sopa', false),
    (r_acorda, 'Água', 1, 'litro', false);

-- ============================================================
-- Caldo Verde
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Caldo Verde',
    'Sopa reconfortante com couve-galega, batata e chouriço.',
    '["Coza batatas em água com sal, cebola e alho.","Reduza as batata a puré com varinha mágica.","Junte couve-galega cortada fina. Coza 5 min.","Sirva com fatias de chouriço e fio de azeite.","Acompanhe com broa de milho."]'::jsonb,
    15, 30, 45, 1, 6,
    ARRAY['portuguesas','sopas','vegetais','tradicional'],
    'Sopas', r_user
) RETURNING id INTO r_caldo_verde;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_caldo_verde, 'Batatas', 500, 'g', false),
    (r_caldo_verde, 'Couve-galega', 300, 'g', false),
    (r_caldo_verde, 'Chouriço', 100, 'g', false),
    (r_caldo_verde, 'Cebola', 1, 'unidade', false),
    (r_caldo_verde, 'Alho', 2, 'dentes', false),
    (r_caldo_verde, 'Azeite', 3, 'colheres de sopa', false),
    (r_caldo_verde, 'Sal', NULL, 'q.b.', false),
    (r_caldo_verde, 'Broa de milho', NULL, 'opcional', true);

-- ============================================================
-- Arroz de Marisco
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Arroz de Marisco',
    'Arroz malandrinho com marisco variado, clássico da costa portuguesa.',
    '["Prepare o refogado com cebola, alho, tomate e azeite.","Junte marisco variado (amêijoas, mexilhões, camarão, lagosta). Adicione vinho branco.","Deixe o marisco abrir. Retire e reserve.","Arefogue o arroz no caldo. Adicione caldo de marisco.","Coza o arroz. Junte o marisco reservado no final.","Sirva com coentros ou salsa picada."]'::jsonb,
    30, 40, 70, 3, 4,
    ARRAY['portuguesas','marisco','arroz','peixe'],
    'Pratos Principais', r_user
) RETURNING id INTO r_arroz_marisco;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_arroz_marisco, 'Arroz carolino', 300, 'g', false),
    (r_arroz_marisco, 'Amêijoas', 300, 'g', false),
    (r_arroz_marisco, 'Mexilhões', 200, 'g', false),
    (r_arroz_marisco, 'Camarão', 200, 'g', false),
    (r_arroz_marisco, 'Lagosta/Centolla', 200, 'g', false),
    (r_arroz_marisco, 'Tomate maduro', 2, 'unidades', false),
    (r_arroz_marisco, 'Vinho branco', 150, 'ml', false),
    (r_arroz_marisco, 'Azeite', 4, 'colheres de sopa', false),
    (r_arroz_marisco, 'Coentros', 1, 'molho', true);

-- ============================================================
-- Bifana
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Bifana',
    'Sandes de porco temperado com alho e mostarda, comida de rua portuguesa.',
    '["Tempera febras de porco com alho, mostarda, colorau, louro e vinho.","Marinar por pelo menos 2 horas.","Grelhe as bifanas numa frigideira com a marinada até estarem cozinhadas.","Sirva no pão com pickles e mostarda extra."]'::jsonb,
    10, 15, 25, 1, 2,
    ARRAY['portuguesas','porco','sandes','street food'],
    'Pratos Principais', r_user
) RETURNING id INTO r_bifana;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_bifana, 'Febras de porco', 400, 'g', false),
    (r_bifana, 'Alho', 3, 'dentes', false),
    (r_bifana, 'Mostarda', 2, 'colheres de sopa', false),
    (r_bifana, 'Colorau', 1, 'colher de chá', false),
    (r_bifana, 'Louro', 1, 'folha', false),
    (r_bifana, 'Vinho branco', 50, 'ml', false),
    (r_bifana, 'Pão cacete', 2, 'unidades', false),
    (r_bifana, 'Pickles', NULL, 'q.b.', true);

-- ============================================================
-- Pizza Margherita
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Pizza Margherita',
    'Pizza clássica italiana com tomate, mozzarella e manjericão fresco.',
    '["Prepare a massa: farinha, água, fermento, sal. Deixe levedar 1h.","Estique a massa numa forma untada.","Cubra com molho de tomate, mozzarella fresca e folhas de manjericão.","Regue com azeite. Leve ao forno a 250°C por 10-12 min.","Sirva imediatamente."]'::jsonb,
    30, 12, 120, 2, 2,
    ARRAY['italiana','pizza','vegetariana'],
    'Pratos Principais', r_user
) RETURNING id INTO r_pizza_marg;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_pizza_marg, 'Farinha de trigo', 300, 'g', false),
    (r_pizza_marg, 'Água morna', 200, 'ml', false),
    (r_pizza_marg, 'Fermento de padeiro', 7, 'g', false),
    (r_pizza_marg, 'Sal', 1, 'colher de chá', false),
    (r_pizza_marg, 'Molho de tomate', 150, 'ml', false),
    (r_pizza_marg, 'Mozzarella fresca', 200, 'g', false),
    (r_pizza_marg, 'Manjericão fresco', 1, 'molho', false),
    (r_pizza_marg, 'Azeite', 2, 'colheres de sopa', false);

-- ============================================================
-- Massa Carbonara
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Massa Carbonara',
    'Espetada romana com guanciale, pecorino e ovos cremosos.',
    '["Coza o esparguete em água salgada al dente.","Frite o guanciale em cubos até ficar crocante.","Bata gemas com pecorino ralado e pimenta preta.","Escorra a massa, junte ao guanciale. Retire do lume.","Adicione a mistura de ovos e mexa rapidamente para criar o creme.","Sirva com mais pecorino e pimenta."]'::jsonb,
    10, 15, 25, 2, 4,
    ARRAY['italiana','massa','ovos'],
    'Pratos Principais', r_user
) RETURNING id INTO r_carbonara;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_carbonara, 'Esparguete', 400, 'g', false),
    (r_carbonara, 'Guanciale (ou bacon)', 150, 'g', false),
    (r_carbonara, 'Gemas de ovo', 4, 'unidades', false),
    (r_carbonara, 'Pecorino ralado', 100, 'g', false),
    (r_carbonara, 'Pimenta preta', NULL, 'q.b.', false),
    (r_carbonara, 'Sal', NULL, 'q.b.', false);

-- ============================================================
-- Risotto de Cogumelos
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Risotto de Cogumelos',
    'Risotto cremoso com cogumelos variados e parmesão.',
    '["Refogue cebola picada na manteiga. Junte arroz arbóreo.","Toste o arroz 2 min. Adicione vinho branco e mexa.","Adicione caldo quente gradualmente, mexendo sempre.","Salteie cogumelos em fatias na manteiga. Junte ao arroz.","Finalize com manteiga fria e parmesão ralado.","Sirva com salsa picada."]'::jsonb,
    15, 35, 50, 3, 4,
    ARRAY['italiana','risotto','cogumelos','vegetariana'],
    'Pratos Principais', r_user
) RETURNING id INTO r_risotto;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_risotto, 'Arroz arbóreo', 300, 'g', false),
    (r_risotto, 'Cogumelos variados', 300, 'g', false),
    (r_risotto, 'Caldo de legumes', 1, 'litro', false),
    (r_risotto, 'Vinho branco', 150, 'ml', false),
    (r_risotto, 'Parmesão ralado', 80, 'g', false),
    (r_risotto, 'Manteiga', 50, 'g', false),
    (r_risotto, 'Cebola', 1, 'unidade', false),
    (r_risotto, 'Salsa fresca', 2, 'colheres de sopa', true);

-- ============================================================
-- Salmão Grelhado
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Salmão Grelhado',
    'Filetes de salmão grelhados com limão e ervas, acompanhados de legumes.',
    '["Tempere o salmão com sal, pimenta, limão e azeite.","Aqueça uma grelha ou frigideira em fogo alto.","Grelhe o salmão pele para baixo 4 min. Vire e mais 3 min.","Prepare legumes salteados (courgette, pimento, cebola).","Sirva o salmão sobre os legumes com gomo de limão."]'::jsonb,
    10, 10, 20, 1, 2,
    ARRAY['peixe','saudável','grelhado'],
    'Pratos Principais', r_user
) RETURNING id INTO r_salmao;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_salmao, 'Filetes de salmão', 2, 'unidades', false),
    (r_salmao, 'Limão', 1, 'unidade', false),
    (r_salmao, 'Azeite', 2, 'colheres de sopa', false),
    (r_salmao, 'Courgette', 1, 'unidade', false),
    (r_salmao, 'Pimento vermelho', 1, 'unidade', false),
    (r_salmao, 'Ervas frescas (endro)', 2, 'colheres de sopa', true),
    (r_salmao, 'Sal e pimenta', NULL, 'q.b.', false);

-- ============================================================
-- Frango Assado
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Frango Assado no Forno',
    'Frango inteiro assado com batatas, limão e ervas aromáticas.',
    '["Tempere o frango com sal, pimenta, alho, limão, azeite e ervas.","Recheie com metade do limão e ramos de tomilho.","Coloque numa assadeira rodeado de batatas cortadas.","Regue com vinho branco. Leve ao forno a 200°C por 1h30.","Regue com o assado a cada 30 min. Deixe repousar 10 min antes de servir."]'::jsonb,
    20, 90, 110, 2, 6,
    ARRAY['aves','forno','tradicional'],
    'Pratos Principais', r_user
) RETURNING id INTO r_frango_assado;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_frango_assado, 'Frango inteiro', 1, 'unidade', false),
    (r_frango_assado, 'Batatas', 500, 'g', false),
    (r_frango_assado, 'Limão', 1, 'unidade', false),
    (r_frango_assado, 'Alho', 4, 'dentes', false),
    (r_frango_assado, 'Tomilho fresco', 3, 'ramos', false),
    (r_frango_assado, 'Azeite', 3, 'colheres de sopa', false),
    (r_frango_assado, 'Vinho branco', 100, 'ml', false),
    (r_frango_assado, 'Sal e pimenta', NULL, 'q.b.', false);

-- ============================================================
-- Lasanha Bolonhesa
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Lasanha Bolonhesa',
    'Lasanha clássica com molho bolonhesa rico e béchamel gratinada.',
    '["Prepare o bolonhesa: refogue cebola, cenoura, aipo. Junte carne picada.","Adicione tomate, vinho, louro. Apure 40 min.","Prepare béchamel: manteiga, farinha, leite, noz-moscada.","Monte camadas: massa, bolonhesa, béchamel, parmesão.","Repita as camadas. Termine com béchamel e queijo.","Leve ao forno a 180°C por 35-40 min até gratinar."]'::jsonb,
    30, 75, 105, 3, 8,
    ARRAY['italiana','massa','carne','forno'],
    'Pratos Principais', r_user
) RETURNING id INTO r_lasanha;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_lasanha, 'Massa para lasanha', 300, 'g', false),
    (r_lasanha, 'Carne de vaca picada', 500, 'g', false),
    (r_lasanha, 'Cebola', 1, 'unidade', false),
    (r_lasanha, 'Cenoura', 1, 'unidade', false),
    (r_lasanha, 'Aipo', 1, 'talo', false),
    (r_lasanha, 'Tomate pelado', 400, 'g', false),
    (r_lasanha, 'Polpa de tomate', 200, 'g', false),
    (r_lasanha, 'Vinho tinto', 100, 'ml', false),
    (r_lasanha, 'Leite', 500, 'ml', false),
    (r_lasanha, 'Farinha', 40, 'g', false),
    (r_lasanha, 'Manteiga', 40, 'g', false),
    (r_lasanha, 'Parmesão ralado', 100, 'g', false),
    (r_lasanha, 'Noz-moscada', 1, 'pitada', false);

-- ============================================================
-- Tacos de Carne
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Tacos de Carne',
    'Tacos mexicanos com carne temperada, guacamole e salsa fresca.',
    '["Tempere carne picada com cominho, colorau, pimenta, alho e cebola.","Salteie a carne até dourar.","Prepare guacamole: abacate esmagado, limão, coentros, sal.","Prepare salsa: tomate, cebola, coentros, lima.","Aqueça as tortilhas. Monte os tacos com carne, guacamole e salsa.","Sirva com lima e natas azedas."]'::jsonb,
    20, 15, 35, 2, 4,
    ARRAY['mexicana','carne','street food'],
    'Pratos Principais', r_user
) RETURNING id INTO r_tacos;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_tacos, 'Carne de vaca picada', 400, 'g', false),
    (r_tacos, 'Tortilhas de milho', 8, 'unidades', false),
    (r_tacos, 'Abacate', 2, 'unidades', false),
    (r_tacos, 'Tomate', 2, 'unidades', false),
    (r_tacos, 'Cebola roxa', 1, 'unidade', false),
    (r_tacos, 'Coentros', 1, 'molho', false),
    (r_tacos, 'Limão/Lima', 2, 'unidades', false),
    (r_tacos, 'Cominho', 1, 'colher de chá', false),
    (r_tacos, 'Colorau', 1, 'colher de chá', false),
    (r_tacos, 'Natas azedas', 100, 'ml', true);

-- ============================================================
-- Pad Thai
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Pad Thai',
    'Prato tailandês clássico de salteado de arroz com camarão, amendoim e lima.',
    '["Demolhe a massa de arroz em água morna 30 min.","Prepare o molho: tamarindo, peixe, açúcar de palma, malagueta.","Salteie camarão no wok com alho. Junte tofu.","Adicione a massa escorrida e o molho. Salteie bem.","Empurre a massa, quebre um ovo no wok e envolva.","Sirva com amendoim moído, rebentos de soja e lima."]'::jsonb,
    20, 15, 35, 3, 2,
    ARRAY['tailandesa','camarão','massa','wok'],
    'Pratos Principais', r_user
) RETURNING id INTO r_pad_thai;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_pad_thai, 'Massa de arroz (pad thai)', 200, 'g', false),
    (r_pad_thai, 'Camarão', 200, 'g', false),
    (r_pad_thai, 'Tofu firme', 100, 'g', false),
    (r_pad_thai, 'Ovos', 2, 'unidades', false),
    (r_pad_thai, 'Rebentos de soja', 100, 'g', false),
    (r_pad_thai, 'Amendoim torrado', 50, 'g', false),
    (r_pad_thai, 'Molho de peixe', 2, 'colheres de sopa', false),
    (r_pad_thai, 'Tamarindo', 2, 'colheres de sopa', false),
    (r_pad_thai, 'Açúcar de palma', 1, 'colher de sopa', false),
    (r_pad_thai, 'Alho', 2, 'dentes', false),
    (r_pad_thai, 'Lima', 1, 'unidade', false);

-- ============================================================
-- Sushi Bowl
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Sushi Bowl',
    'Bowl de sushi descontruído com arroz, salmão, abacate e molho de soja.',
    '["Coza o arroz japonês. Tempere com vinagre de arroz, açúcar e sal.","Corte o salmão em cubos. Tempere com molho de soja e óleo de sésamo.","Corte abacate, pepino e cenoura em fatias finas.","Monte o bowl: arroz no fundo, salmão, abacate, pepino, cenoura.","Regue com molho de soja, maionese de wasabi e sementes de sésamo.","Decore com nori desfiado."]'::jsonb,
    20, 20, 40, 2, 2,
    ARRAY['japonesa','peixe','bowl','saudável'],
    'Pratos Principais', r_user
) RETURNING id INTO r_sushi_bowl;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_sushi_bowl, 'Arroz japonês', 200, 'g', false),
    (r_sushi_bowl, 'Salmão fresco (sashimi)', 200, 'g', false),
    (r_sushi_bowl, 'Abacate', 1, 'unidade', false),
    (r_sushi_bowl, 'Pepino', 1, 'unidade', false),
    (r_sushi_bowl, 'Cenoura', 1, 'unidade', false),
    (r_sushi_bowl, 'Molho de soja', 3, 'colheres de sopa', false),
    (r_sushi_bowl, 'Vinagre de arroz', 2, 'colheres de sopa', false),
    (r_sushi_bowl, 'Óleo de sésamo', 1, 'colher de sopa', false),
    (r_sushi_bowl, 'Sementes de sésamo', 1, 'colher de sopa', false),
    (r_sushi_bowl, 'Alga nori', 2, 'folhas', true),
    (r_sushi_bowl, 'Wasabi', NULL, 'q.b.', true);

-- ============================================================
-- Salada Caesar
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Salada Caesar',
    'Salada clássica com alface romana, croutons, parmesão e molho Caesar.',
    '["Lave e corte a alface romana em pedaços.","Prepare croutons: toste cubos de pão com azeite e alho no forno.","Prepare o molho: maionese, alho, anchovas, limão, mostarda, parmesão.","Misture a alface com o molho. Adicione croutons e lascas de parmesão.","Sirva com peito de frango grelhado (opcional)."]'::jsonb,
    15, 10, 25, 1, 2,
    ARRAY['americana','saladas','frango'],
    'Saladas', r_user
) RETURNING id INTO r_salada_caesar;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_salada_caesar, 'Alface romana', 1, 'unidade', false),
    (r_salada_caesar, 'Pão (croutons)', 2, 'fatias', false),
    (r_salada_caesar, 'Parmesão', 50, 'g', false),
    (r_salada_caesar, 'Maionese', 3, 'colheres de sopa', false),
    (r_salada_caesar, 'Alho', 1, 'dente', false),
    (r_salada_caesar, 'Anchovas', 3, 'unidades', false),
    (r_salada_caesar, 'Limão', 0.5, 'unidade', false),
    (r_salada_caesar, 'Mostarda Dijon', 1, 'colher de chá', false),
    (r_salada_caesar, 'Peito de frango', 200, 'g', true);

-- ============================================================
-- Hambúrguer Caseiro
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Hambúrguer Caseiro',
    'Hambúrguer artesanal com carne de vaca, queijo cheddar e molho especial.',
    '["Misture carne picada com sal, pimenta e cebola caramelizada.","Forme hambúrgueres com cerca de 150 g cada.","Grelhe os hambúrgueres 4 min de cada lado em fogo alto.","Coloque queijo cheddar por cima no último minuto.","Toaste os pão de hambúrguer.","Monte: pão, alface, tomate, hambúrguer, queijo, pickles, molho."]'::jsonb,
    15, 10, 25, 2, 4,
    ARRAY['americana','carne','sandes'],
    'Pratos Principais', r_user
) RETURNING id INTO r_hamburguer;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_hamburguer, 'Carne de vaca picada', 600, 'g', false),
    (r_hamburguer, 'Pão de hambúrguer', 4, 'unidades', false),
    (r_hamburguer, 'Queijo cheddar', 4, 'fatias', false),
    (r_hamburguer, 'Alface iceberg', 4, 'folhas', false),
    (r_hamburguer, 'Tomate', 1, 'unidade', false),
    (r_hamburguer, 'Cebola caramelizada', 1, 'unidade', false),
    (r_hamburguer, 'Pickles', 8, 'unidades', false),
    (r_hamburguer, 'Ketchup', NULL, 'q.b.', true),
    (r_hamburguer, 'Mostarda', NULL, 'q.b.', true);

-- ============================================================
-- Sopa de Legumes
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Sopa de Legumes',
    'Sopa reconfortante com legumes da época, perfeita para dias frios.',
    '["Descasque e corte todos os legumes em cubos.","Refogue cebola e alho no azeite.","Junte os legumes e a água. Tempere com sal e louro.","Coza em fogo médio por 30 min.","Triture com varinha mágica até obter creme liso.","Sirva com fio de azeite e salsa picada."]'::jsonb,
    15, 30, 45, 1, 6,
    ARRAY['sopas','vegetariana','saudável'],
    'Sopas', r_user
) RETURNING id INTO r_sopa_legumes;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_sopa_legumes, 'Batatas', 300, 'g', false),
    (r_sopa_legumes, 'Cenoura', 200, 'g', false),
    (r_sopa_legumes, 'Abóbora', 200, 'g', false),
    (r_sopa_legumes, 'Cebola', 1, 'unidade', false),
    (r_sopa_legumes, 'Alho', 2, 'dentes', false),
    (r_sopa_legumes, 'Azeite', 3, 'colheres de sopa', false),
    (r_sopa_legumes, 'Louro', 1, 'folha', false),
    (r_sopa_legumes, 'Água', 1.5, 'litros', false),
    (r_sopa_legumes, 'Sal', NULL, 'q.b.', false);

-- ============================================================
-- Omelete Queijo e Fiambre
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Omelete de Queijo e Fiambre',
    'Omotele fofo e rápida com queijo derretido e fiambre.',
    '["Bata 3 ovos com sal e pimenta.","Aqueça manteiga numa frigideira antiaderente em fogo médio.","Verta os ovos. Mexa levemente com espátula.","Quando começar a firmar, adicione queijo ralado e fiambre.","Dobre a omelete ao meio. Sirva imediatamente."]'::jsonb,
    5, 5, 10, 1, 1,
    ARRAY['ovos','rápido','pequeno-almoço'],
    'Pequeno-Almoço', r_user
) RETURNING id INTO r_omelete;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_omelete, 'Ovos', 3, 'unidades', false),
    (r_omelete, 'Queijo ralado', 50, 'g', false),
    (r_omelete, 'Fiambre', 2, 'fatias', false),
    (r_omelete, 'Manteiga', 10, 'g', false),
    (r_omelete, 'Sal e pimenta', NULL, 'q.b.', false),
    (r_omelete, 'Salsa', 1, 'colher de sopa', true);

-- ============================================================
-- Panquecas
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Panquecas',
    'Panquecas fofas e douradas, perfeitas para o pequeno-almoço.',
    '["Misture farinha, açúcar, fermento e sal.","Noutra tigela: leite, ovo, manteiga derretida.","Junte líquidos aos secos. Misture sem bater demais.","Aqueça frigideira com manteiga. Verta uma concha de massa.","Quando borbulhar, vire. Cozinhe mais 1 min.","Sirva com maple syrup, fruta fresca e natas batidas."]'::jsonb,
    10, 15, 25, 1, 4,
    ARRAY['pequeno-almoço','doces','americana'],
    'Pequeno-Almoço', r_user
) RETURNING id INTO r_panquecas;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_panquecas, 'Farinha de trigo', 1.5, 'chávenas', false),
    (r_panquecas, 'Leite', 1, 'chávena', false),
    (r_panquecas, 'Ovo', 1, 'unidade', false),
    (r_panquecas, 'Manteiga derretida', 2, 'colheres de sopa', false),
    (r_panquecas, 'Açúcar', 1, 'colher de sopa', false),
    (r_panquecas, 'Fermento em pó', 2, 'colheres de chá', false),
    (r_panquecas, 'Sal', 0.5, 'colher de chá', false),
    (r_panquecas, 'Maple syrup', NULL, 'q.b.', true);

-- ============================================================
-- Waffles
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Waffles',
    'Waffles crocantes por fora e fofos por dentro.',
    '["Misture farinha, açúcar, fermento e sal.","Bata ovos com leite, manteilha derretida e baunilha.","Junte líquidos aos secos. Misture bem.","Pré-aqueça a máquina de waffles. Unte com manteiga.","Verta massa e cozinhe até dourar (cerca de 4 min).","Sirva com fruta, natas ou chocolate."]'::jsonb,
    10, 15, 25, 1, 4,
    ARRAY['pequeno-almoço','doces','americana'],
    'Pequeno-Almoço', r_user
) RETURNING id INTO r_waffles;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_waffles, 'Farinha de trigo', 2, 'chávenas', false),
    (r_waffles, 'Ovos', 2, 'unidades', false),
    (r_waffles, 'Leite', 1.5, 'chávenas', false),
    (r_waffles, 'Manteiga derretida', 60, 'g', false),
    (r_waffles, 'Açúcar', 2, 'colheres de sopa', false),
    (r_waffles, 'Fermento em pó', 1, 'colher de sopa', false),
    (r_waffles, 'Extrato de baunilha', 1, 'colher de chá', false),
    (r_waffles, 'Sal', 0.5, 'colher de chá', false);

-- ============================================================
-- Tosta Mista
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Tosta Mista',
    'Sandes tostada com fiambre e queijo, clássico português.',
    '["Coloque fiambre e queijo entre duas fatias de pão de forma.","Passe manteiga por fora do pão.","Toeste na sanduicheira ou frigideira até o queijo derreter.","Sirva quente, cortada ao meio."]'::jsonb,
    5, 5, 10, 1, 1,
    ARRAY['portuguesas','sandes','rápido'],
    'Lanches', r_user
) RETURNING id INTO r_tosta_mista;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_tosta_mista, 'Pão de forma', 2, 'fatias', false),
    (r_tosta_mista, 'Fiambre', 2, 'fatias', false),
    (r_tosta_mista, 'Queijo', 2, 'fatias', false),
    (r_tosta_mista, 'Manteiga', 10, 'g', false);

-- ============================================================
-- Sanduíche Natural
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Sanduíche Natural',
    'Sandes leve e saudável com frango, alface e iogurte.',
    '["Desfie frango cozido. Misture com iogurte natural, sal e pimenta.","Toste levemente o pão integral.","Coloque alface, tomate e a mistura de frango.","Feche a sandes. Sirva fresco."]'::jsonb,
    10, 0, 10, 1, 1,
    ARRAY['saudável','frango','sandes'],
    'Lanches', r_user
) RETURNING id INTO r_sanduiche_nat;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_sanduiche_nat, 'Pão integral', 2, 'fatias', false),
    (r_sanduiche_nat, 'Frango desfiado', 100, 'g', false),
    (r_sanduiche_nat, 'Iogurte natural', 2, 'colheres de sopa', false),
    (r_sanduiche_nat, 'Alface', 2, 'folhas', false),
    (r_sanduiche_nat, 'Tomate', 2, 'rodelas', false),
    (r_sanduiche_nat, 'Sal e pimenta', NULL, 'q.b.', false);

-- ============================================================
-- Esparguete à Bolonhesa
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Esparguete à Bolonhesa',
    'Clássico italiano com molho de carne rico e tomate.',
    '["Refogue cebola, cenoura e aipo picados.","Adicione carne de vaca picada. Doure bem.","Junte tomate pelado, polpa, vinho tinto, louro. Apure 30 min.","Coza o esparguete al dente. Escorra.","Sirva o esparguete com o molho e parmesão ralado."]'::jsonb,
    15, 45, 60, 2, 4,
    ARRAY['italiana','massa','carne'],
    'Pratos Principais', r_user
) RETURNING id INTO r_bolonhesa;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_bolonhesa, 'Esparguete', 400, 'g', false),
    (r_bolonhesa, 'Carne de vaca picada', 400, 'g', false),
    (r_bolonhesa, 'Cebola', 1, 'unidade', false),
    (r_bolonhesa, 'Cenoura', 1, 'unidade', false),
    (r_bolonhesa, 'Aipo', 1, 'talo', false),
    (r_bolonhesa, 'Tomate pelado', 400, 'g', false),
    (r_bolonhesa, 'Polpa de tomate', 100, 'g', false),
    (r_bolonhesa, 'Vinho tinto', 100, 'ml', false),
    (r_bolonhesa, 'Parmesão ralado', 50, 'g', true),
    (r_bolonhesa, 'Louro', 1, 'folha', false);

-- ============================================================
-- Feijoada
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Feijoada',
    'Prato brasileiro com feijão preto, carnes de porco e acompanhamentos.',
    '["Demolhe o feijão preto 12h. Coze com louro.","Demolhe carnes salgadas (orelha, pé, chouriço) 24h.","Coza as carnes até ficarem tenras. Corte em pedaços.","Junte o feijão cozido às carnes. Apure 30 min.","Sirva com arroz branco, couve refogada, farofa e laranja."]'::jsonb,
    30, 120, 150, 3, 8,
    ARRAY['brasileira','feijão','porco','tradicional'],
    'Pratos Principais', r_user
) RETURNING id INTO r_feijoada;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_feijoada, 'Feijão preto', 500, 'g', false),
    (r_feijoada, 'Carne de porco salgada', 300, 'g', false),
    (r_feijoada, 'Chouriço', 200, 'g', false),
    (r_feijoada, 'Bacon', 150, 'g', false),
    (r_feijoada, 'Louro', 2, 'folhas', false),
    (r_feijoada, 'Alho', 4, 'dentes', false),
    (r_feijoada, 'Arroz branco', 300, 'g', false),
    (r_feijoada, 'Couve-galega', 200, 'g', false),
    (r_feijoada, 'Farinha de mandioca (farofa)', 100, 'g', false),
    (r_feijoada, 'Laranja', 2, 'unidades', false);

-- ============================================================
-- Cataplana de Marisco
-- ============================================================
INSERT INTO recipes (title, description, steps, prep_time, cook_time, total_time, difficulty, portions, tags, category, user_id)
VALUES (
    'Cataplana de Marisco',
    'Marisco cozido na cataplana com tomate, pimento e coentros, clássico algarvio.',
    '["Refogue cebola, alho, tomate e pimento na cataplana com azeite.","Junte amêijoas, mexilhões, camarão e tamboril.","Adicione vinho branco, louro e piripiri.","Feche a cataplana. Cozinhe em fogo médio 15 min.","Abra, verifique se as amêijoas abriram. Polvilhe com coentros.","Sirva com pão para molhar no caldo."]'::jsonb,
    20, 20, 40, 3, 4,
    ARRAY['portuguesas','marisco','cataplana','Algarve'],
    'Pratos Principais', r_user
) RETURNING id INTO r_cataplana;

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, optional) VALUES
    (r_cataplana, 'Amêijoas', 300, 'g', false),
    (r_cataplana, 'Mexilhões', 300, 'g', false),
    (r_cataplana, 'Camarão', 200, 'g', false),
    (r_cataplana, 'Tamboril', 200, 'g', false),
    (r_cataplana, 'Tomate maduro', 2, 'unidades', false),
    (r_cataplana, 'Pimento vermelho', 1, 'unidade', false),
    (r_cataplana, 'Cebola', 1, 'unidade', false),
    (r_cataplana, 'Alho', 3, 'dentes', false),
    (r_cataplana, 'Vinho branco', 150, 'ml', false),
    (r_cataplana, 'Coentros', 1, 'molho', false),
    (r_cataplana, 'Louro', 1, 'folha', false),
    (r_cataplana, 'Piripiri', NULL, 'q.b.', true);

-- ============================================================
-- 5. SEED PANTRY ITEMS
-- ============================================================

INSERT INTO pantry_items (user_id, name, quantity, unit, category, expiry_date) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Ovos', 12, 'unidades', 'Frigorífico', '2026-06-20'),
    ('00000000-0000-0000-0000-000000000000', 'Leite', 1, 'L', 'Frigorífico', '2026-06-15'),
    ('00000000-0000-0000-0000-000000000000', 'Manteiga', 250, 'g', 'Frigorífico', '2026-07-01'),
    ('00000000-0000-0000-0000-000000000000', 'Queijo', 200, 'g', 'Frigorífico', '2026-06-25'),
    ('00000000-0000-0000-0000-000000000000', 'Frango', 500, 'g', 'Frigorífico', '2026-06-12'),
    ('00000000-0000-0000-0000-000000000000', 'Massa', 500, 'g', 'Despensa', '2027-01-01'),
    ('00000000-0000-0000-0000-000000000000', 'Arroz', 1, 'kg', 'Despensa', '2027-03-01'),
    ('00000000-0000-0000-0000-000000000000', 'Azeite', 500, 'ml', 'Despensa', '2026-12-01'),
    ('00000000-0000-0000-0000-000000000000', 'Cebola', 3, 'unidades', 'Despensa', '2026-07-01'),
    ('00000000-0000-0000-0000-000000000000', 'Alho', 1, 'cabeça', 'Despensa', '2026-08-01'),
    ('00000000-0000-0000-0000-000000000000', 'Tomate', 5, 'unidades', 'Frigorífico', '2026-06-14'),
    ('00000000-0000-0000-0000-000000000000', 'Farinha', 1, 'kg', 'Despensa', '2026-10-01'),
    ('00000000-0000-0000-0000-000000000000', 'Açúcar', 500, 'g', 'Despensa', '2027-06-01'),
    ('00000000-0000-0000-0000-000000000000', 'Sal', 1, 'kg', 'Despensa', NULL),
    ('00000000-0000-0000-0000-000000000000', 'Peixe congelado', 400, 'g', 'Congelador', '2026-09-01'),
    ('00000000-0000-0000-0000-000000000000', 'Legumes congelados', 300, 'g', 'Congelador', '2026-08-01'),
    ('00000000-0000-0000-0000-000000000000', 'Pão', 1, 'unidade', 'Despensa', '2026-06-11'),
    ('00000000-0000-0000-0000-000000000000', 'Banana', 6, 'unidades', 'Frigorífico', '2026-06-13'),
    ('00000000-0000-0000-0000-000000000000', 'Iogurte', 4, 'unidades', 'Frigorífico', '2026-06-16'),
    ('00000000-0000-0000-0000-000000000000', 'Bacalhau', 300, 'g', 'Frigorífico', '2026-06-18');
END $$;

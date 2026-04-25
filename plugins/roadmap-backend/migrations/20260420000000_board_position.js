/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('features', table => {
    table.integer('board_position').notNullable().defaultTo(0);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('features', table => {
    table.dropColumn('board_position');
  });
};

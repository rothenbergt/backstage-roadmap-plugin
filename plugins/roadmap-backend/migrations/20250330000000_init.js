exports.up = async function up(knex) {
  // Create features table
  await knex.schema.createTable('features', table => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description').notNullable();
    table
      .enum('status', [
        'Suggested',
        'Planned',
        'InProgress',
        'Completed',
        'Declined',
      ])
      .notNullable()
      .defaultTo('Suggested');
    table.integer('votes').notNullable().defaultTo(0);
    table.string('author').notNullable();
    table.timestamps(true, true);
  });

  // Create comments table
  await knex.schema.createTable('comments', table => {
    table.increments('id').primary();
    table.integer('feature_id').unsigned().notNullable();
    table.text('text').notNullable();
    table.string('author').notNullable();
    table.timestamps(true, true);
    table
      .foreign('feature_id')
      .references('id')
      .inTable('features')
      .onDelete('CASCADE');
  });

  // Create votes table
  await knex.schema.createTable('votes', table => {
    table.increments('id').primary();
    table.integer('feature_id').unsigned().notNullable();
    table.string('voter').notNullable();
    table.timestamps(true, true);
    table
      .foreign('feature_id')
      .references('id')
      .inTable('features')
      .onDelete('CASCADE');
    table.unique(['feature_id', 'voter']);
  });
};

exports.down = async function down(knex) {
  // Drop tables in reverse order to avoid foreign key constraints
  await knex.schema.dropTable('votes');
  await knex.schema.dropTable('comments');
  await knex.schema.dropTable('features');
};

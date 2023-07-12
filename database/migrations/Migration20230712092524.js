'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20230712092524 extends Migration {

  async up() {
    this.addSql('alter table `guild` add `nickname_channel_id` varchar(255) null, add `greeting_channel_id` varchar(255) null;');
  }

  async down() {
    this.addSql('alter table `guild` drop `nickname_channel_id`;');
    this.addSql('alter table `guild` drop `greeting_channel_id`;');
  }

}
exports.Migration20230712092524 = Migration20230712092524;

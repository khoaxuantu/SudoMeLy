'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20230715043002 extends Migration {

  async up() {
    this.addSql('alter table `guild` add `reply_channel_ids` text null, add `log_channel_id` varchar(255) null;');
  }

  async down() {
    this.addSql('alter table `guild` drop `reply_channel_ids`;');
    this.addSql('alter table `guild` drop `log_channel_id`;');
  }

}
exports.Migration20230715043002 = Migration20230715043002;

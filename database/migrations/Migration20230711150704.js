'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20230711150704 extends Migration {

  async up() {
    this.addSql('create table `data` (`key` varchar(255) not null, `created_at` datetime not null, `updated_at` datetime not null, `value` varchar(255) not null default \'\', primary key (`key`)) default character set utf8mb4 engine = InnoDB;');

    this.addSql('create table `guild` (`id` varchar(255) not null, `created_at` datetime not null, `updated_at` datetime not null, `prefix` varchar(255) null, `deleted` tinyint(1) not null default false, `last_interact` datetime not null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;');

    this.addSql('create table `image` (`id` int unsigned not null auto_increment primary key, `created_at` datetime not null, `updated_at` datetime not null, `file_name` varchar(255) not null, `base_path` varchar(255) not null default \'\', `url` varchar(255) not null, `size` int not null, `tags` text not null, `hash` varchar(255) not null, `delete_hash` varchar(255) not null) default character set utf8mb4 engine = InnoDB;');

    this.addSql('create table `pastebin` (`id` varchar(255) not null, `edit_code` varchar(255) not null, `lifetime` int not null default -1, `created_at` datetime not null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;');

    this.addSql('create table `stat` (`id` int unsigned not null auto_increment primary key, `type` varchar(255) not null, `value` varchar(255) not null default \'\', `additional_data` json null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');

    this.addSql('create table `user` (`id` varchar(255) not null, `created_at` datetime not null, `updated_at` datetime not null, `last_interact` datetime not null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;');
  }

}
exports.Migration20230711150704 = Migration20230711150704;

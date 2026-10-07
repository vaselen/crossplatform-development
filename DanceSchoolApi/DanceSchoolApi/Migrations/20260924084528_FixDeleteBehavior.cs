using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DanceSchoolApi.Migrations
{
    /// <inheritdoc />
    public partial class FixDeleteBehavior : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subscriptions_Tariffs_TariffId",
                table: "Subscriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_Teams_Teachers_TeacherId",
                table: "Teams");

            migrationBuilder.AddForeignKey(
                name: "FK_Subscriptions_Tariffs_TariffId",
                table: "Subscriptions",
                column: "TariffId",
                principalTable: "Tariffs",
                principalColumn: "TariffId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Teams_Teachers_TeacherId",
                table: "Teams",
                column: "TeacherId",
                principalTable: "Teachers",
                principalColumn: "TeacherId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subscriptions_Tariffs_TariffId",
                table: "Subscriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_Teams_Teachers_TeacherId",
                table: "Teams");

            migrationBuilder.AddForeignKey(
                name: "FK_Subscriptions_Tariffs_TariffId",
                table: "Subscriptions",
                column: "TariffId",
                principalTable: "Tariffs",
                principalColumn: "TariffId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Teams_Teachers_TeacherId",
                table: "Teams",
                column: "TeacherId",
                principalTable: "Teachers",
                principalColumn: "TeacherId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

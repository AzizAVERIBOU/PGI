using Serilog;
using Microsoft.EntityFrameworkCore;
using BackendPGI.Data;
using BackendPGI.Services;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

// Configuration de Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// Utiliser Serilog comme provider de logging
builder.Host.UseSerilog();

// Configuration de la base de données MySQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrEmpty(connectionString))
{
    Log.Error("La chaîne de connexion MySQL n'est pas configurée dans appsettings.json");
    throw new InvalidOperationException("La chaîne de connexion MySQL est requise.");
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// Configuration CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
    
    // Pour la production, utilisez une politique plus restrictive :
    // options.AddPolicy("AllowSpecificOrigin", policy =>
    // {
    //     policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
    //           .AllowAnyMethod()
    //           .AllowAnyHeader()
    //           .AllowCredentials();
    // });
});

// Services
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Configurer JSON pour accepter camelCase (comme JavaScript)
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthorization();

// Enregistrer le service d'initialisation des données
builder.Services.AddScoped<DataInitializationService>();

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS doit être appelé avant UseAuthorization et MapControllers
app.UseCors("AllowAll");

app.UseAuthorization();
app.MapControllers();

try
{
    Log.Information("Démarrage de l'application BackendPGI");
    
    // Initialiser les données automatiquement au démarrage
    using (var scope = app.Services.CreateScope())
    {
        var initializationService = scope.ServiceProvider.GetRequiredService<DataInitializationService>();
        await initializationService.InitializeDataAsync();
    }
    
    Log.Information("Initialisation terminée. Démarrage du serveur...");
    
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "L'application s'est arrêtée de manière inattendue");
}
finally
{
    Log.CloseAndFlush();
}

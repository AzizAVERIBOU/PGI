using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using BackendPGI.Data;
using BackendPGI.Models;

namespace BackendPGI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ControllerClient : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ControllerClient(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("test-connection")]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                Log.Information("Test de connexion à la base de données MySQL");
                
                var connection = _context.Database.GetDbConnection();
                var connectionString = connection.ConnectionString;
                
                // Tester la connexion MySQL
                var canConnect = await _context.Database.CanConnectAsync();
                
                if (canConnect)
                {
                    // Ouvrir la connexion pour obtenir plus d'informations
                    if (connection.State != System.Data.ConnectionState.Open)
                    {
                        await connection.OpenAsync();
                    }
                    
                    // Exécuter une requête MySQL pour vérifier la version
                    using var command = connection.CreateCommand();
                    command.CommandText = "SELECT VERSION()";
                    var version = await command.ExecuteScalarAsync() as string;
                    
                    // Compter les tables
                    command.CommandText = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()";
                    var tableCount = await command.ExecuteScalarAsync();
                    
                    Log.Information("Connexion MySQL réussie - Version: {Version}, Tables: {TableCount}", version, tableCount);
                    
                    return Ok(new 
                    { 
                        success = true, 
                        message = "Connexion à la base de données MySQL réussie",
                        provider = "MySQL",
                        database = connection.Database,
                        server = connection.DataSource,
                        serverVersion = version,
                        tableCount = tableCount?.ToString(),
                        connectionState = connection.State.ToString(),
                        timestamp = DateTime.Now
                    });
                }
                else
                {
                    Log.Warning("Impossible de se connecter à la base de données MySQL");
                    return StatusCode(503, new 
                    { 
                        success = false, 
                        message = "Impossible de se connecter à la base de données MySQL",
                        provider = "MySQL",
                        connectionState = connection.State.ToString(),
                        timestamp = DateTime.Now
                    });
                }
            }
            catch (DbUpdateException dbEx)
            {
                Log.Error(dbEx, "Erreur de base de données lors du test de connexion MySQL");
                return StatusCode(500, new 
                { 
                    success = false, 
                    message = "Erreur de base de données MySQL",
                    provider = "MySQL",
                    error = dbEx.InnerException?.Message ?? dbEx.Message,
                    timestamp = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors du test de connexion à la base de données MySQL");
                return StatusCode(500, new 
                { 
                    success = false, 
                    message = "Erreur lors du test de connexion MySQL",
                    provider = "MySQL",
                    error = ex.Message,
                    timestamp = DateTime.Now
                });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] Models.DTOs.LoginClientDto loginDto)
        {
            try
            {
                // Validation du modèle
                if (!ModelState.IsValid)
                {
                    Log.Warning("Tentative de connexion client avec des données invalides");
                    return BadRequest(new 
                    { 
                        success = false,
                        message = "Données de connexion invalides",
                        errors = ModelState
                    });
                }

                Log.Information("Tentative de connexion pour le client : {Email}", loginDto.Email);

                // Rechercher le client par email
                var client = await _context.Clients
                    .FirstOrDefaultAsync(c => c.Email == loginDto.Email);

                // Vérifier si le client existe
                if (client == null)
                {
                    Log.Warning("Échec de connexion : client non trouvé - {Email}", loginDto.Email);
                    return Unauthorized(new 
                    { 
                        success = false,
                        message = "Email ou mot de passe incorrect"
                    });
                }

                // Vérifier le mot de passe avec BCrypt
                bool isPasswordValid = BCrypt.Net.BCrypt.Verify(loginDto.MotDePasse, client.MotDePasse);

                if (!isPasswordValid)
                {
                    Log.Warning("Échec de connexion : mot de passe incorrect - {Email}", loginDto.Email);
                    return Unauthorized(new 
                    { 
                        success = false,
                        message = "Email ou mot de passe incorrect"
                    });
                }

                // Connexion réussie
                Log.Information("Connexion réussie pour le client : {Email} - {Nom}", 
                    client.Email, client.Nom);

                // Retourner les informations du client (sans le mot de passe)
                var clientResponse = new
                {
                    success = true,
                    message = "Connexion réussie",
                    client = new
                    {
                        client.Id,
                        client.Nom,
                        client.Email,
                        client.Telephone,
                        client.Adresse,
                        client.DateCreation
                    },
                    timestamp = DateTime.Now
                };

                return Ok(clientResponse);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la connexion du client : {Email}", loginDto.Email);
                return StatusCode(500, new 
                { 
                    success = false,
                    message = "Une erreur est survenue lors de la connexion",
                    error = ex.Message
                });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetClients()
        {
            Log.Information("Récupération de la liste des clients");
            
            var clients = await _context.Clients
                .Select(c => new
                {
                    c.Id,
                    c.Nom,
                    c.Email,
                    c.Telephone,
                    c.Adresse,
                    c.DateCreation
                    // MotDePasse exclu pour la sécurité
                })
                .ToListAsync();

            Log.Information("Nombre de clients retournés : {Count}", clients.Count);
            return Ok(clients);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetClient(int id)
        {
            Log.Information("Récupération du client avec l'ID : {ClientId}", id);
            
            var client = await _context.Clients.FindAsync(id);
            
            if (client == null)
            {
                Log.Warning("Client avec l'ID {ClientId} non trouvé", id);
                return NotFound();
            }
            
            Log.Information("Client trouvé : {ClientNom}", client.Nom);
            
            // Retourner le client sans le mot de passe
            var clientResponse = new
            {
                client.Id,
                client.Nom,
                client.Email,
                client.Telephone,
                client.Adresse,
                client.DateCreation
                // MotDePasse exclu pour la sécurité
            };
            
            return Ok(clientResponse);
        }

        [HttpPost]
        public async Task<IActionResult> CreateClient([FromBody] Client client)
        {
            // Validation du modèle
            if (!ModelState.IsValid)
            {
                Log.Warning("Tentative de création d'un client avec des données invalides");
                return BadRequest(ModelState);
            }

            // Vérifier si l'email existe déjà
            var emailExists = await _context.Clients
                .AnyAsync(c => c.Email == client.Email);
            
            if (emailExists)
            {
                Log.Warning("Tentative de création d'un client avec un email existant : {Email}", client.Email);
                return Conflict(new { message = "Un client avec cet email existe déjà." });
            }

            try
            {
                Log.Information("Création d'un nouveau client : {ClientNom}, Email: {Email}", client.Nom, client.Email);
                
                // Hasher le mot de passe avec BCrypt
                client.MotDePasse = BCrypt.Net.BCrypt.HashPassword(client.MotDePasse);
                
                // S'assurer que la date de création est définie
                if (client.DateCreation == default)
                {
                    client.DateCreation = DateTime.Now;
                }
                
                _context.Clients.Add(client);
                await _context.SaveChangesAsync();
                
                Log.Information("Client créé avec succès - ID: {ClientId}, Nom: {ClientNom}", client.Id, client.Nom);
                
                // Retourner le client sans le mot de passe
                var clientResponse = new
                {
                    client.Id,
                    client.Nom,
                    client.Email,
                    client.Telephone,
                    client.Adresse,
                    client.DateCreation
                };
                
                return CreatedAtAction(nameof(GetClient), new { id = client.Id }, clientResponse);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la création du client : {ClientNom}", client.Nom);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la création du client." });
            }
        }
    }
}


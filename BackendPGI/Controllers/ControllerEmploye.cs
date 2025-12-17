using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using BackendPGI.Data;
using BackendPGI.Models;

namespace BackendPGI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ControllerEmploye : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ControllerEmploye(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("departements")]
        public IActionResult GetDepartements()
        {
            Log.Information("Récupération de la liste des départements");
            
            var departements = Enum.GetValues(typeof(Departement))
                .Cast<Departement>()
                .Select(d => new
                {
                    id = (int)d,
                    nom = d.ToString(),
                    nomAffichage = d switch
                    {
                        Departement.ServiceClientele => "Service à la clientèle",
                        Departement.Stocks => "Gestion des stocks",
                        Departement.Finances => "Finances",
                        _ => d.ToString()
                    }
                })
                .ToList();

            return Ok(departements);
        }

        [HttpGet("roles")]
        public IActionResult GetRoles()
        {
            Log.Information("Récupération de la liste des rôles");
            
            var roles = Enum.GetValues(typeof(Role))
                .Cast<Role>()
                .Select(r => new
                {
                    id = (int)r,
                    nom = r.ToString(),
                    nomAffichage = r switch
                    {
                        Role.Employe => "Employé",
                        Role.Admin => "Administrateur",
                        _ => r.ToString()
                    }
                })
                .ToList();

            return Ok(roles);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] Models.DTOs.LoginEmployeDto loginDto)
        {
            try
            {
                // Validation du modèle
                if (!ModelState.IsValid)
                {
                    Log.Warning("Tentative de connexion avec des données invalides");
                    return BadRequest(new 
                    { 
                        success = false,
                        message = "Données de connexion invalides",
                        errors = ModelState
                    });
                }

                Log.Information("Tentative de connexion pour l'employé : {NumeroEmploye}", loginDto.NumeroEmploye);

                // Rechercher l'employé par numéro d'employé
                var employe = await _context.Employes
                    .FirstOrDefaultAsync(e => e.NumeroEmploye == loginDto.NumeroEmploye);

                // Vérifier si l'employé existe
                if (employe == null)
                {
                    Log.Warning("Échec de connexion : employé non trouvé - {NumeroEmploye}", loginDto.NumeroEmploye);
                    return Unauthorized(new 
                    { 
                        success = false,
                        message = "Numéro d'employé ou mot de passe incorrect"
                    });
                }

                // Vérifier si l'employé est actif
                if (!employe.EstActif)
                {
                    Log.Warning("Échec de connexion : compte désactivé - {NumeroEmploye}", loginDto.NumeroEmploye);
                    return Unauthorized(new 
                    { 
                        success = false,
                        message = "Votre compte a été désactivé. Veuillez contacter un administrateur."
                    });
                }

                // Vérifier le mot de passe avec BCrypt
                bool isPasswordValid = BCrypt.Net.BCrypt.Verify(loginDto.MotDePasse, employe.MotDePasse);

                if (!isPasswordValid)
                {
                    Log.Warning("Échec de connexion : mot de passe incorrect - {NumeroEmploye}", loginDto.NumeroEmploye);
                    return Unauthorized(new 
                    { 
                        success = false,
                        message = "Numéro d'employé ou mot de passe incorrect"
                    });
                }

                // Connexion réussie
                Log.Information("Connexion réussie pour l'employé : {NumeroEmploye} - {Nom} {Prenom}", 
                    employe.NumeroEmploye, employe.Nom, employe.Prenom);

                // Charger le supérieur et les subordonnés
                await _context.Entry(employe)
                    .Reference(e => e.Superieur)
                    .LoadAsync();
                
                await _context.Entry(employe)
                    .Collection(e => e.Subordonnes)
                    .Query()
                    .Where(s => s.EstActif)
                    .LoadAsync();

                // Retourner les informations de l'employé (sans le mot de passe)
                var employeResponse = new
                {
                    success = true,
                    message = "Connexion réussie",
                    employe = new
                    {
                        employe.Id,
                        employe.NumeroEmploye,
                        employe.Nom,
                        employe.Prenom,
                        employe.Email,
                        employe.Telephone,
                        employe.Poste,
                        employe.Departement,
                        departementNom = employe.Departement switch
                        {
                            Departement.ServiceClientele => "Service à la clientèle",
                            Departement.Stocks => "Gestion des stocks",
                            Departement.Finances => "Finances",
                            _ => employe.Departement.ToString()
                        },
                        employe.Role,
                        roleNom = employe.Role switch
                        {
                            Role.Employe => "Employé",
                            Role.Admin => "Administrateur",
                            _ => employe.Role.ToString()
                        },
                        employe.DateEmbauche,
                        employe.EstActif,
                        superieur = employe.Superieur != null ? new
                        {
                            employe.Superieur.Id,
                            employe.Superieur.NumeroEmploye,
                            employe.Superieur.Nom,
                            employe.Superieur.Prenom,
                            employe.Superieur.Poste,
                            employe.Superieur.Role
                        } : null,
                        subordonnes = employe.Subordonnes.Select(s => new
                        {
                            s.Id,
                            s.NumeroEmploye,
                            s.Nom,
                            s.Prenom,
                            s.Poste,
                            s.Departement,
                            s.Role
                        }).ToList(),
                        nombreSubordonnes = employe.Subordonnes.Count
                    },
                    timestamp = DateTime.Now
                };

                return Ok(employeResponse);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la connexion de l'employé : {NumeroEmploye}", loginDto.NumeroEmploye);
                return StatusCode(500, new 
                { 
                    success = false,
                    message = "Une erreur est survenue lors de la connexion",
                    error = ex.Message
                });
            }
        }

        [HttpGet("test-connection")]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                Log.Information("Test de connexion à la base de données MySQL pour les employés");
                
                var connection = _context.Database.GetDbConnection();
                var canConnect = await _context.Database.CanConnectAsync();
                
                if (canConnect)
                {
                    if (connection.State != System.Data.ConnectionState.Open)
                    {
                        await connection.OpenAsync();
                    }
                    
                    using var command = connection.CreateCommand();
                    command.CommandText = "SELECT VERSION()";
                    var version = await command.ExecuteScalarAsync() as string;
                    
                    Log.Information("Connexion MySQL réussie - Version: {Version}", version);
                    
                    return Ok(new 
                    { 
                        success = true, 
                        message = "Connexion à la base de données MySQL réussie",
                        provider = "MySQL",
                        database = connection.Database,
                        server = connection.DataSource,
                        serverVersion = version,
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
                        timestamp = DateTime.Now
                    });
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors du test de connexion à la base de données MySQL");
                return StatusCode(500, new 
                { 
                    success = false, 
                    message = "Erreur lors du test de connexion MySQL",
                    error = ex.Message,
                    timestamp = DateTime.Now
                });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetEmployes()
        {
            Log.Information("Récupération de la liste des employés");
            
            var employes = await _context.Employes
                .Where(e => e.EstActif)
                .Include(e => e.Superieur)
                .Include(e => e.Subordonnes.Where(s => s.EstActif))
                .ToListAsync();
            
            var employesResponse = employes.Select(e => new
            {
                e.Id,
                e.NumeroEmploye,
                e.Nom,
                e.Prenom,
                e.Email,
                e.Telephone,
                e.Poste,
                e.Departement,
                departementNom = e.Departement switch
                {
                    Departement.ServiceClientele => "Service à la clientèle",
                    Departement.Stocks => "Gestion des stocks",
                    Departement.Finances => "Finances",
                    _ => e.Departement.ToString()
                },
                e.Role,
                roleNom = e.Role switch
                {
                    Role.Employe => "Employé",
                    Role.Admin => "Administrateur",
                    _ => e.Role.ToString()
                },
                e.DateEmbauche,
                e.EstActif,
                superieur = e.Superieur != null ? new
                {
                    e.Superieur.Id,
                    e.Superieur.NumeroEmploye,
                    e.Superieur.Nom,
                    e.Superieur.Prenom,
                    e.Superieur.Poste,
                    e.Superieur.Role
                } : null,
                subordonnes = e.Subordonnes
                    .Where(s => s.EstActif)
                    .Select(s => new
                    {
                        s.Id,
                        s.NumeroEmploye,
                        s.Nom,
                        s.Prenom,
                        s.Poste,
                        s.Departement,
                        s.Role
                    })
                    .ToList(),
                nombreSubordonnes = e.Subordonnes.Count(s => s.EstActif)
            }).ToList();

            Log.Information("Nombre d'employés retournés : {Count}", employesResponse.Count);
            return Ok(employesResponse);
        }

        [HttpGet("{id}/subordonnes")]
        public async Task<IActionResult> GetSubordonnes(int id)
        {
            Log.Information("Récupération des subordonnés de l'employé : {EmployeId}", id);
            
            var employe = await _context.Employes.FindAsync(id);
            
            if (employe == null)
            {
                Log.Warning("Employé avec l'ID {EmployeId} non trouvé", id);
                return NotFound(new { message = "Employé non trouvé" });
            }

            var subordonnes = await _context.Employes
                .Where(e => e.SuperieurId == id && e.EstActif)
                .Select(e => new
                {
                    e.Id,
                    e.NumeroEmploye,
                    e.Nom,
                    e.Prenom,
                    e.Email,
                    e.Poste,
                    e.Departement,
                    e.Role,
                    e.DateEmbauche
                })
                .ToListAsync();

            Log.Information("Nombre de subordonnés trouvés : {Count}", subordonnes.Count);
            return Ok(new
            {
                superieur = new
                {
                    employe.Id,
                    employe.NumeroEmploye,
                    employe.Nom,
                    employe.Prenom,
                    employe.Poste
                },
                subordonnes = subordonnes,
                count = subordonnes.Count
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetEmploye(int id)
        {
            Log.Information("Récupération de l'employé avec l'ID : {EmployeId}", id);
            
            var employe = await _context.Employes.FindAsync(id);
            
            if (employe == null)
            {
                Log.Warning("Employé avec l'ID {EmployeId} non trouvé", id);
                return NotFound();
            }
            
            Log.Information("Employé trouvé : {EmployeNom} {EmployePrenom}", employe.Nom, employe.Prenom);
            
            // Charger le supérieur et les subordonnés
            await _context.Entry(employe)
                .Reference(e => e.Superieur)
                .LoadAsync();
            
            await _context.Entry(employe)
                .Collection(e => e.Subordonnes)
                .Query()
                .Where(s => s.EstActif)
                .LoadAsync();
            
            // Retourner l'employé sans le mot de passe
            var employeResponse = new
            {
                employe.Id,
                employe.NumeroEmploye,
                employe.Nom,
                employe.Prenom,
                employe.Email,
                employe.Telephone,
                employe.Poste,
                employe.Departement,
                departementNom = employe.Departement switch
                {
                    Departement.ServiceClientele => "Service à la clientèle",
                    Departement.Stocks => "Gestion des stocks",
                    Departement.Finances => "Finances",
                    _ => employe.Departement.ToString()
                },
                employe.Role,
                roleNom = employe.Role switch
                {
                    Role.Employe => "Employé",
                    Role.Admin => "Administrateur",
                    _ => employe.Role.ToString()
                },
                employe.DateEmbauche,
                employe.EstActif,
                superieur = employe.Superieur != null ? new
                {
                    employe.Superieur.Id,
                    employe.Superieur.NumeroEmploye,
                    employe.Superieur.Nom,
                    employe.Superieur.Prenom,
                    employe.Superieur.Poste,
                    employe.Superieur.Role
                } : null,
                subordonnes = employe.Subordonnes.Select(s => new
                {
                    s.Id,
                    s.NumeroEmploye,
                    s.Nom,
                    s.Prenom,
                    s.Poste,
                    s.Departement,
                    s.Role
                }).ToList(),
                nombreSubordonnes = employe.Subordonnes.Count
                // MotDePasse exclu pour la sécurité
            };
            
            return Ok(employeResponse);
        }

        [HttpPost]
        public async Task<IActionResult> CreateEmploye([FromBody] Employe employe)
        {
            // Validation du modèle
            if (!ModelState.IsValid)
            {
                Log.Warning("Tentative de création d'un employé avec des données invalides");
                return BadRequest(ModelState);
            }

            // Vérifier si le numéro d'employé existe déjà
            var numeroExists = await _context.Employes
                .AnyAsync(e => e.NumeroEmploye == employe.NumeroEmploye);
            
            if (numeroExists)
            {
                Log.Warning("Tentative de création d'un employé avec un numéro existant : {NumeroEmploye}", employe.NumeroEmploye);
                return Conflict(new { message = "Un employé avec ce numéro existe déjà." });
            }

            // Vérifier si l'email existe déjà (seulement si un email est fourni)
            if (!string.IsNullOrEmpty(employe.Email))
            {
                var emailExists = await _context.Employes
                    .AnyAsync(e => e.Email == employe.Email);
                
                if (emailExists)
                {
                    Log.Warning("Tentative de création d'un employé avec un email existant : {Email}", employe.Email);
                    return Conflict(new { message = "Un employé avec cet email existe déjà." });
                }
            }

            try
            {
                Log.Information("Création d'un nouvel employé : {EmployeNom} {EmployePrenom}, Numéro: {NumeroEmploye}", 
                    employe.Nom, employe.Prenom, employe.NumeroEmploye);
                
                // Hasher le mot de passe avec BCrypt
                employe.MotDePasse = BCrypt.Net.BCrypt.HashPassword(employe.MotDePasse);
                
                // S'assurer que la date d'embauche est définie
                if (employe.DateEmbauche == default)
                {
                    employe.DateEmbauche = DateTime.Now;
                }

                // Assigner automatiquement un supérieur immédiat
                // Si l'employé n'est pas Admin, lui assigner un Admin du même département
                Log.Information("Vérification pour assignation du supérieur - Role: {Role}, SuperieurId actuel: {SuperieurId}", 
                    employe.Role, employe.SuperieurId);
                
                if (employe.Role != Role.Admin && !employe.SuperieurId.HasValue)
                {
                    Log.Information("Recherche d'un supérieur dans le département {Departement}", employe.Departement);
                    
                    var adminsDisponibles = await _context.Employes
                        .Where(e => e.Role == Role.Admin 
                                 && e.Departement == employe.Departement 
                                 && e.EstActif)
                        .ToListAsync();
                    
                    Log.Information("Nombre d'admins trouvés dans le département {Departement}: {Count}", 
                        employe.Departement, adminsDisponibles.Count);
                    
                    var superieur = adminsDisponibles.OrderBy(e => e.DateEmbauche).FirstOrDefault();

                    if (superieur != null)
                    {
                        employe.SuperieurId = superieur.Id;
                        Log.Information("✓ Supérieur assigné : {SuperieurNom} {SuperieurPrenom} (ID: {SuperieurId})", 
                            superieur.Nom, superieur.Prenom, superieur.Id);
                        Log.Information("SuperieurId de l'employé avant SaveChanges : {SuperieurId}", employe.SuperieurId);
                    }
                    else
                    {
                        Log.Warning("✗ Aucun administrateur trouvé dans le département {Departement}", 
                            employe.Departement);
                    }
                }
                else
                {
                    if (employe.Role == Role.Admin)
                    {
                        Log.Information("Employé est Admin, pas de supérieur assigné");
                    }
                    else
                    {
                        Log.Information("Supérieur déjà assigné : {SuperieurId}", employe.SuperieurId);
                    }
                }
                
                _context.Employes.Add(employe);
                
                // Log pour vérifier que SuperieurId est bien défini avant SaveChanges
                var entry = _context.Entry(employe);
                foreach (var prop in entry.Properties)
                {
                    Log.Information("Propriété {PropertyName} = {Value}", prop.Metadata.Name, prop.CurrentValue);
                }
                
                await _context.SaveChangesAsync();
                
                Log.Information("Employé créé avec succès - ID: {EmployeId}, Numéro: {NumeroEmploye}", 
                    employe.Id, employe.NumeroEmploye);
                
                // Charger le supérieur et les subordonnés pour l'afficher dans la réponse
                await _context.Entry(employe)
                    .Reference(e => e.Superieur)
                    .LoadAsync();
                
                await _context.Entry(employe)
                    .Collection(e => e.Subordonnes)
                    .Query()
                    .Where(s => s.EstActif)
                    .LoadAsync();

                // Retourner l'employé sans le mot de passe
                var employeResponse = new
                {
                    employe.Id,
                    employe.NumeroEmploye,
                    employe.Nom,
                    employe.Prenom,
                    employe.Email,
                    employe.Telephone,
                    employe.Poste,
                    employe.Departement,
                    departementNom = employe.Departement switch
                    {
                        Departement.ServiceClientele => "Service à la clientèle",
                        Departement.Stocks => "Gestion des stocks",
                        Departement.Finances => "Finances",
                        _ => employe.Departement.ToString()
                    },
                    employe.Role,
                    roleNom = employe.Role switch
                    {
                        Role.Employe => "Employé",
                        Role.Admin => "Administrateur",
                        _ => employe.Role.ToString()
                    },
                    employe.DateEmbauche,
                    employe.EstActif,
                    superieur = employe.Superieur != null ? new
                    {
                        employe.Superieur.Id,
                        employe.Superieur.NumeroEmploye,
                        employe.Superieur.Nom,
                        employe.Superieur.Prenom,
                        employe.Superieur.Poste,
                        employe.Superieur.Role
                    } : null,
                    subordonnes = employe.Subordonnes.Select(s => new
                    {
                        s.Id,
                        s.NumeroEmploye,
                        s.Nom,
                        s.Prenom,
                        s.Poste,
                        s.Departement,
                        s.Role
                    }).ToList(),
                    nombreSubordonnes = employe.Subordonnes.Count
                };
                
                return CreatedAtAction(nameof(GetEmploye), new { id = employe.Id }, employeResponse);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la création de l'employé : {EmployeNom} {EmployePrenom}", 
                    employe.Nom, employe.Prenom);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la création de l'employé." });
            }
        }

        [HttpGet("superieur/{id}")]
        public async Task<IActionResult> GetSuperieur(int id)
        {
            Log.Information("Récupération du supérieur de l'employé ID : {EmployeId}", id);
            
            var employe = await _context.Employes
                .Include(e => e.Superieur)
                .FirstOrDefaultAsync(e => e.Id == id);
            
            if (employe == null)
            {
                Log.Warning("Employé avec l'ID {EmployeId} non trouvé", id);
                return NotFound(new { message = $"Employé avec l'ID {id} non trouvé" });
            }
            
            if (employe.Superieur == null)
            {
                return Ok(new { message = "Cet employé n'a pas de supérieur", superieur = (object?)null });
            }
            
            var superieurResponse = new
            {
                employe.Superieur.Id,
                employe.Superieur.NumeroEmploye,
                employe.Superieur.Nom,
                employe.Superieur.Prenom,
                employe.Superieur.Email,
                employe.Superieur.Telephone,
                employe.Superieur.Poste,
                employe.Superieur.Departement,
                departementNom = employe.Superieur.Departement switch
                {
                    Departement.ServiceClientele => "Service à la clientèle",
                    Departement.Stocks => "Gestion des stocks",
                    Departement.Finances => "Finances",
                    _ => employe.Superieur.Departement.ToString()
                },
                employe.Superieur.Role,
                roleNom = employe.Superieur.Role switch
                {
                    Role.Employe => "Employé",
                    Role.Admin => "Administrateur",
                    _ => employe.Superieur.Role.ToString()
                },
                employe.Superieur.DateEmbauche,
                employe.Superieur.EstActif
            };
            
            return Ok(superieurResponse);
        }

        [HttpPut("{id}/statut")]
        public async Task<IActionResult> UpdateStatut(int id, [FromBody] bool estActif)
        {
            Log.Information("Mise à jour du statut de l'employé {Id} : {EstActif}", id, estActif);
            
            var employe = await _context.Employes.FindAsync(id);
            if (employe == null)
                return NotFound(new { message = $"Employé avec l'ID {id} non trouvé" });
            
            employe.EstActif = estActif;
            await _context.SaveChangesAsync();
            
            Log.Information("Statut de l'employé {Id} mis à jour : {EstActif}", id, estActif);
            return Ok(new { message = "Statut de l'employé mis à jour", id = employe.Id, estActif = employe.EstActif });
        }
    }
}


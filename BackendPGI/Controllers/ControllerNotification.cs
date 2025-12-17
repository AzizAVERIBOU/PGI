using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using BackendPGI.Data;
using BackendPGI.Models;

namespace BackendPGI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ControllerNotification : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ControllerNotification(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Récupère toutes les notifications pour un département
        /// </summary>
        [HttpGet("departement/{departementId}")]
        public async Task<IActionResult> GetNotificationsByDepartement(int departementId, [FromQuery] bool? nonLuesSeulement = false)
        {
            try
            {
                Log.Information("Récupération des notifications pour le département {DepartementId}", departementId);

                var query = _context.Notifications
                    .Where(n => n.DepartementId == departementId);

                if (nonLuesSeulement == true)
                {
                    query = query.Where(n => !n.EstLue);
                }

                var notifications = await query
                    .OrderByDescending(n => n.DateCreation)
                    .ToListAsync();

                var response = notifications.Select(n => new
                {
                    n.Id,
                    n.DepartementId,
                    n.Type,
                    n.Titre,
                    n.Message,
                    n.Priorite,
                    n.LienAction,
                    n.ReferenceId,
                    n.EstLue,
                    n.DateCreation,
                    n.DateLecture,
                    DonneesSupplementaires = !string.IsNullOrEmpty(n.DonneesSupplementaires)
                        ? System.Text.Json.JsonSerializer.Deserialize<object>(n.DonneesSupplementaires)
                        : null
                }).ToList();

                Log.Information("Nombre de notifications retournées pour le département {DepartementId} : {Count}", 
                    departementId, response.Count);

                return Ok(new
                {
                    departementId,
                    total = response.Count,
                    nonLues = response.Count(n => !n.EstLue),
                    notifications = response
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la récupération des notifications pour le département {DepartementId}", departementId);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la récupération des notifications." });
            }
        }

        /// <summary>
        /// Récupère le nombre de notifications non lues pour un département
        /// </summary>
        [HttpGet("departement/{departementId}/count")]
        public async Task<IActionResult> GetNotificationCount(int departementId)
        {
            try
            {
                var total = await _context.Notifications
                    .CountAsync(n => n.DepartementId == departementId);

                var nonLues = await _context.Notifications
                    .CountAsync(n => n.DepartementId == departementId && !n.EstLue);

                var parPriorite = await _context.Notifications
                    .Where(n => n.DepartementId == departementId && !n.EstLue)
                    .GroupBy(n => n.Priorite)
                    .Select(g => new
                    {
                        priorite = g.Key ?? "Info",
                        count = g.Count()
                    })
                    .ToListAsync();

                return Ok(new
                {
                    departementId,
                    total,
                    nonLues,
                    parPriorite
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors du comptage des notifications pour le département {DepartementId}", departementId);
                return StatusCode(500, new { message = "Une erreur est survenue lors du comptage des notifications." });
            }
        }

        /// <summary>
        /// Marque une notification comme lue
        /// </summary>
        [HttpPut("{id}/marquer-lue")]
        public async Task<IActionResult> MarquerCommeLue(int id)
        {
            try
            {
                Log.Information("Marquage de la notification {Id} comme lue", id);

                var notification = await _context.Notifications.FindAsync(id);
                if (notification == null)
                {
                    Log.Warning("Notification avec l'ID {Id} non trouvée", id);
                    return NotFound(new { message = "Notification non trouvée" });
                }

                notification.EstLue = true;
                notification.DateLecture = DateTime.Now;

                await _context.SaveChangesAsync();

                Log.Information("Notification {Id} marquée comme lue", id);

                return Ok(new
                {
                    success = true,
                    message = "Notification marquée comme lue"
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors du marquage de la notification {Id} comme lue", id);
                return StatusCode(500, new { message = "Une erreur est survenue lors du marquage de la notification." });
            }
        }

        /// <summary>
        /// Marque toutes les notifications d'un département comme lues
        /// </summary>
        [HttpPut("departement/{departementId}/marquer-toutes-lues")]
        public async Task<IActionResult> MarquerToutesCommeLues(int departementId)
        {
            try
            {
                Log.Information("Marquage de toutes les notifications du département {DepartementId} comme lues", departementId);

                var notifications = await _context.Notifications
                    .Where(n => n.DepartementId == departementId && !n.EstLue)
                    .ToListAsync();

                var maintenant = DateTime.Now;
                foreach (var notification in notifications)
                {
                    notification.EstLue = true;
                    notification.DateLecture = maintenant;
                }

                await _context.SaveChangesAsync();

                Log.Information("{Count} notifications marquées comme lues pour le département {DepartementId}", 
                    notifications.Count, departementId);

                return Ok(new
                {
                    success = true,
                    message = $"{notifications.Count} notification(s) marquée(s) comme lue(s)",
                    nombreMarquees = notifications.Count
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors du marquage des notifications du département {DepartementId}", departementId);
                return StatusCode(500, new { message = "Une erreur est survenue lors du marquage des notifications." });
            }
        }

        /// <summary>
        /// Supprime une notification
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> SupprimerNotification(int id)
        {
            try
            {
                Log.Information("Suppression de la notification {Id}", id);

                var notification = await _context.Notifications.FindAsync(id);
                if (notification == null)
                {
                    Log.Warning("Notification avec l'ID {Id} non trouvée", id);
                    return NotFound(new { message = "Notification non trouvée" });
                }

                _context.Notifications.Remove(notification);
                await _context.SaveChangesAsync();

                Log.Information("Notification {Id} supprimée", id);

                return Ok(new
                {
                    success = true,
                    message = "Notification supprimée avec succès"
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la suppression de la notification {Id}", id);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la suppression de la notification." });
            }
        }
    }
}


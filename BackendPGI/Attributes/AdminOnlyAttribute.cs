using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace BackendPGI.Attributes
{
    /// <summary>
    /// Attribut pour restreindre l'accès aux administrateurs uniquement
    /// </summary>
    public class AdminOnlyAttribute : ActionFilterAttribute
    {
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            var user = context.HttpContext.User;
            
            // Vérifier si l'utilisateur est authentifié
            if (!user.Identity?.IsAuthenticated ?? true)
            {
                context.Result = new UnauthorizedObjectResult(new 
                { 
                    message = "Vous devez être connecté pour accéder à cette ressource." 
                });
                return;
            }

            // Vérifier si l'utilisateur a le rôle Admin
            var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value;
            
            if (roleClaim != "Admin" && roleClaim != "2")
            {
                context.Result = new ForbidResult();
                context.HttpContext.Response.StatusCode = 403;
                context.Result = new ObjectResult(new 
                { 
                    message = "Accès refusé. Seuls les administrateurs peuvent accéder à cette ressource." 
                })
                {
                    StatusCode = 403
                };
                return;
            }

            base.OnActionExecuting(context);
        }
    }
}


if(['/simular-financiamento','/privacidade-financiamento'].includes(location.pathname))import('./financing-application.js');
else if(location.pathname==='/admin'||location.pathname.startsWith('/admin/'))import('./admin/main.js');
else import('./main.js');

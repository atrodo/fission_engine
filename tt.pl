#!/usr/bin/perl
use strict;
use warnings;

use FindBin;
use local::lib "$FindBin::Bin/local";

use Data::Dumper;
use Template;
use CGI qw(-no_debug :standard);
use MIME::Type::FileName;
use File::Basename qw/dirname/;

my $cgi = CGI->new;

#print Data::Dumper::Dumper($cgi, \%ENV);

my $in_cgi = defined $ENV{PATH_INFO} || defined $ENV{GATEWAY_INTERFACE};
my $request_uri = $in_cgi ? $ENV{REQUEST_URI} : shift || "index.html";

$request_uri =~ s/[.]tt2$//
  if !$in_cgi;

my $file = "$FindBin::Bin/" . $request_uri . ".tt2";
my $vars = {};

my $template = Template->new(
  EVAL_PERL => 1,
  ABSOLUTE => 1,
  INCLUDE_PATH => [
    "$FindBin::Bin/" . dirname($request_uri),
    "$FindBin::Bin/",
  ],
);

my $output = '';
my $success = $template->process( $file, $vars, \$output );

if ($success)
{
  if ($in_cgi)
  {
    print $cgi->header( MIME::Type::FileName::guess( $request_uri ),
      '200 OK GO' );
  }
  print $output;
}
else
{
  print $cgi->header( 'text/html', '404 Not Found' );

  print $template->error
    if !$in_cgi;

  print "$FindBin::Bin/" . dirname($request_uri);
}

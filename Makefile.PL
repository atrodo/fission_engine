use ExtUtils::MakeMaker;

WriteMakefile(
  NAME => 'fission_engine',
  AUTHOR => ["atrodo"],
  LICENSE => 'artistic_2',
  PREREQ_PM => {
    'Template' => 0,
    'MIME::Type::FileName' => 0,
  },
);

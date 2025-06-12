#ifndef MIDI_SETTINGS_H
#define MIDI_SETTINGS_H

#include <MIDI.h>

struct MySettings : public MIDI_NAMESPACE::DefaultSettings
{
  static const unsigned SysExMaxSize = 256; // For macOS USB MIDI compatibility
};

#endif // MIDI_SETTINGS_H